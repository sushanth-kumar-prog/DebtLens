from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import shutil
import tempfile
from typing import Dict, Any, List

# Import our services
from app.services.git_analyzer import GitAnalyzer
from app.services.code_analyzer import CodeAnalyzer
from app.services.secret_scanner import SecretScanner
from app.services.ml_engine import MLEngine
from app.services.ai_prioritization import AIPrioritizationEngine

router = APIRouter()

class AnalysisRequest(BaseModel):
    repository_path: str  # Can be a local absolute path or Git https URL

@router.post("/analyze")
async def analyze_repository(request: AnalysisRequest):
    repo_input = request.repository_path
    
    # Validation
    is_remote = repo_input.startswith(("http://", "https://", "git@"))
    target_path = repo_input

    # If remote, we clone it to a temp dir first, then scan
    temp_dir = None
    if is_remote:
        try:
            temp_dir = tempfile.mkdtemp(prefix="debtlens_run_")
            print(f"Temporary clone of remote repo to: {temp_dir}")
            # Use git analyzer clone helper
            git_loader = GitAnalyzer(repo_input)
            git_loader.initialize()
            target_path = git_loader.local_path
            # Store git loader in request state if we wanted to reuse, but we can do it inline
        except Exception as e:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"Failed to clone remote repository: {str(e)}")

    try:
        # 1. Run Git History Analysis
        git_analyzer = GitAnalyzer(target_path)
        git_analyzer.initialize()
        git_metrics = git_analyzer.analyze_history()

        # 2. Run Code Quality & AST Analysis
        code_analyzer = CodeAnalyzer(target_path)
        code_results = code_analyzer.scan_repository()
        code_metrics = code_results["files"]
        duplicates = code_results["duplicates"]

        # 3. Scan for Secret Leaks
        secret_scanner = SecretScanner(target_path)
        secrets = secret_scanner.scan_git_history()

        # 4. Correlate metrics
        correlated_metrics = {}
        for filepath, code_data in code_metrics.items():
            git_data = git_metrics.get(filepath, {
                "churn": 0,
                "bug_commits": 0,
                "reverts": 0,
                "bus_factor": 1,
                "primary_author": "None",
                "knowledge_concentration": 0.0,
                "total_authors": 0
            })

            correlated_metrics[filepath] = {
                **code_data,
                **git_data
            }

        # 5. Run Machine Learning Prioritization
        ml_engine = MLEngine()
        ranked_files = ml_engine.calculate_priority_scores(correlated_metrics)

        # 6. Generate AI Summaries for Top 5 Hotspots
        ai_engine = AIPrioritizationEngine()
        top_hotspots = ranked_files[:5]
        for hotspot in top_hotspots:
            hotspot["ai_recommendations"] = await ai_engine.generate_refactoring_tips(hotspot)

        # Calculate Repository Level Aggregates
        total_loc = sum(f["loc"] for f in ranked_files)
        total_churn = sum(f["churn"] for f in ranked_files)
        avg_complexity = sum(f["max_complexity"] for f in ranked_files) / max(len(ranked_files), 1)
        total_secrets = len(secrets)
        total_bugs = sum(f["bug_commits"] for f in ranked_files)

        # Build Dependency Graph structure for Frontend D3 view
        # We need nodes and links
        nodes = []
        links = []
        node_set = set()

        for f in ranked_files:
            nodes.append({
                "id": f["filepath"],
                "loc": f["loc"],
                "score": f["priority_score"],
                "complexity": f["max_complexity"]
            })
            node_set.add(f["filepath"])

        for filepath, metrics in code_metrics.items():
            for dep in metrics.get("dependencies", []):
                # Check if dependency matches other files in project
                # (Simple match for mock/hackathon import resolution)
                for node_id in node_set:
                    if dep.replace('.', '/') in node_id or node_id.endswith(dep):
                        links.append({
                            "source": filepath,
                            "target": node_id
                        })

        response_payload = {
            "summary": {
                "total_files": len(ranked_files),
                "total_loc": total_loc,
                "total_churn": total_churn,
                "avg_complexity": round(avg_complexity, 2),
                "total_secrets_leaked": total_secrets,
                "total_bugs_found": total_bugs
            },
            "ranked_files": ranked_files,
            "secrets": secrets,
            "duplicates": duplicates,
            "dependency_graph": {
                "nodes": nodes,
                "links": links
            }
        }

        # Cleanup if remote
        if is_remote:
            git_analyzer.cleanup()

        return response_payload

    except Exception as e:
        if is_remote and 'git_analyzer' in locals():
            git_analyzer.cleanup()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

class ChatRequest(BaseModel):
    question: str
    repo_summary: Dict[str, Any]
    hotspots: List[Dict[str, Any]]

@router.post("/chat")
async def chat_with_codebase(request: ChatRequest):
    question = request.question
    summary = request.repo_summary
    hotspots = request.hotspots[:5]  # Limit to top 5 files to preserve token limits

    # Format files summary context for LLM
    files_context = "\n".join([
        f"- File: {f['filepath']} | CCN: {f['max_complexity']} | Churn: {f['churn']} | Bugs: {f['bug_commits']}"
        for f in hotspots
    ])

    prompt = f"""
    You are the lead software architect for this repository. 
    Here is the repository analytics summary context:
    - Total Files: {summary.get('total_files', 0)}
    - Lines of Code: {summary.get('total_loc', 0)}
    - Total Churn (Edits): {summary.get('total_churn', 0)}
    - Average Complexity: {summary.get('avg_complexity', 0)}
    - Total Bugs Found: {summary.get('total_bugs_found', 0)}
    - Leaked Secrets Found: {summary.get('total_secrets_leaked', 0)}

    Top 5 critical files/hotspots:
    {files_context}

    Developer Question: "{question}"
    
    Answer the developer's question in plain human English based on the metrics context above. 
    Keep it direct, honest, and practical. Do not use corporate marketing speak or hype words.
    """

    ai_engine = AIPrioritizationEngine()
    
    # Contextual fallback answers for demo if API calls fail or offline
    fallback_answer = f"I've reviewed the codebase data. Regarding your question about '{question}':\n\n"
    if "test" in question.lower():
        fallback_answer += "You should prioritize adding tests to files with high churn and bug frequency. Specifically, focusing tests on **" + (hotspots[0]['filepath'] if hotspots else 'the main files') + "** will yield the highest return on investment since it is modified frequently and currently accounts for bugs."
    elif "fix" in question.lower() or "first" in question.lower():
        fallback_answer += "Your immediate action plan should focus on **" + (hotspots[0]['filepath'] if hotspots else 'the complex hotspots') + "**. It has the highest priority score because it combines deep branching logic with high commit churn, meaning developers touch it often and it breaks."
    else:
        fallback_answer += "Looking at your project size of " + str(summary.get('total_loc', 0)) + " lines across " + str(summary.get('total_files', 0)) + " files, you have an average cyclomatic complexity of " + str(summary.get('avg_complexity', 0)) + ". The best next step is to run modularity cleanups on your highest complexity hotspots before they grow larger."

    answer = await ai_engine.ask_llm(prompt, fallback_answer, max_tokens=500)
    return {"answer": answer}
