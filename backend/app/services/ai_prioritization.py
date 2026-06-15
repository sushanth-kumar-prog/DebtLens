import os
import httpx
from typing import Dict, Any, List

# Simple non-technical analogy:
# Imagine this service as a friendly lead engineer who reviews the raw numbers (metrics) 
# and writes a human-readable memo on how to fix the problem, in simple language a developer understands.

class AIPrioritizationEngine:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")

    async def generate_refactoring_tips(self, file_metric: Dict[str, Any]) -> str:
        """Call LLM API to get precise code rewrite/refactoring tips."""
        filepath = file_metric.get("filepath", "")
        complexity = file_metric.get("max_complexity", 1)
        churn = file_metric.get("churn", 1)
        bugs = file_metric.get("bug_commits", 0)

        prompt = f"""
        Analyze this codebase file profile for technical debt:
        - File Path: {filepath}
        - Cyclomatic Complexity: {complexity}
        - Git Churn (modifications): {churn}
        - Bug Commit Frequency: {bugs}

        Provide a concise, 3-bullet-point refactoring recommendation.
        Format it in clear Markdown. Focus on how to structure the code to reduce churn and bugs.
        """

        mock_fallback = self._generate_mock_tips(filepath, complexity, churn)
        return await self.ask_llm(prompt, mock_fallback, max_tokens=300)

    async def ask_llm(self, prompt: str, fallback_text: str, max_tokens: int = 500) -> str:
        """Helper to invoke Gemini, Claude, or fallback to mock response dynamically."""
        # 1. Try Gemini Free API first
        if self.gemini_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=payload, timeout=20.0)
                    if response.status_code == 200:
                        resp_json = response.json()
                        return resp_json["candidates"][0]["content"]["parts"][0]["text"]
            except Exception:
                pass

        # 2. Try Claude API
        if self.api_key:
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            data = {
                "model": "claude-3-haiku-20240307",
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}]
            }
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers=headers,
                        json=data,
                        timeout=20.0
                    )
                    if response.status_code == 200:
                        resp_json = response.json()
                        return resp_json["content"][0]["text"]
            except Exception:
                pass

        # 3. Fallback to mock / text
        return fallback_text

    def _generate_mock_tips(self, filepath: str, complexity: int, churn: int) -> str:
        """Fallback method producing highly contextual refactoring tips."""
        ext = os.path.splitext(filepath)[1]
        
        if ext == '.py':
            return (
                f"* **Decompose Functions:** With a complexity score of {complexity}, split large functions "
                "into smaller, single-responsibility helper methods.\n"
                f"* **Decouple Module:** Since this file has high churn ({churn} modifications), extract "
                "core logic into separate classes or external modules to avoid changing the same file repeatedly.\n"
                "* **Add Unit Tests:** Implement edge case checks on critical path flows to lower bugs."
            )
        else:
            return (
                f"* **Break Down Components:** The JSX/TS structure shows functional components that can be "
                "separated into smaller, atomic UI parts.\n"
                f"* **Extract Custom Hooks:** Move complex state logic and lifecycle handlers out of the view layer.\n"
                f"* **Optimize Rendering:** Implement memoization or check for unnecessary dependency re-renders."
            )
