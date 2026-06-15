import os
import re
import hashlib
from typing import Dict, Any, List, Set, Tuple
from radon.complexity import cc_visit

# Simple non-technical analogy:
# Imagine this service as a code doctor. It opens each file, counts how many complex "if/else" decisions 
# the computer must make (complexity), finds lines of code that were copy-pasted (duplicates), 
# and draws a map of how different files lean on each other to work (dependencies).

class CodeAnalyzer:
    def __init__(self, repo_dir: str):
        self.repo_dir = repo_dir

    def calculate_python_complexity(self, code_content: str) -> Dict[str, Any]:
        """Calculate cyclomatic complexity for Python files using radon."""
        try:
            results = cc_visit(code_content)
            if not results:
                return {"max_complexity": 1, "avg_complexity": 1, "complexity_rank": "A"}
            
            complexities = [item.complexity for item in results]
            max_complexity = max(complexities)
            avg_complexity = sum(complexities) / len(complexities)
            
            # Radon standard ranks
            if max_complexity <= 5:
                rank = "A"
            elif max_complexity <= 10:
                rank = "B"
            elif max_complexity <= 20:
                rank = "C"
            elif max_complexity <= 30:
                rank = "D"
            else:
                rank = "F"

            return {
                "max_complexity": max_complexity,
                "avg_complexity": avg_complexity,
                "complexity_rank": rank
            }
        except Exception:
            return {"max_complexity": 1, "avg_complexity": 1, "complexity_rank": "A"}

    def calculate_js_complexity(self, code_content: str) -> Dict[str, Any]:
        """Estimate complexity of JS/TS using control flow density estimation."""
        lines = code_content.splitlines()
        # Count control flow branching keywords
        branch_keywords = re.compile(r'\b(if|else\s+if|for|while|catch|switch|case|&&|\|\|)\b')
        complexity = 1
        for line in lines:
            # Strip comments
            line = re.sub(r'//.*|/\*.*?\*/', '', line)
            complexity += len(branch_keywords.findall(line))
        
        if complexity <= 5:
            rank = "A"
        elif complexity <= 10:
            rank = "B"
        elif complexity <= 20:
            rank = "C"
        elif complexity <= 30:
            rank = "D"
        else:
            rank = "F"

        return {
            "max_complexity": complexity,
            "avg_complexity": complexity * 0.7,
            "complexity_rank": rank
        }

    def extract_dependencies(self, filepath: str, code_content: str) -> Set[str]:
        """Extract import statements from Python and JS/TS files."""
        dependencies = set()
        
        if filepath.endswith('.py'):
            # Python Imports
            import_regexes = [
                re.compile(r'^import\s+([\w\.]+)'),
                re.compile(r'^from\s+([\w\.]+)\s+import')
            ]
            for line in code_content.splitlines():
                line = line.strip()
                for regex in import_regexes:
                    match = regex.match(line)
                    if match:
                        dependencies.add(match.group(1))
        elif filepath.endswith(('.js', '.jsx', '.ts', '.tsx')):
            # JS/TS Imports
            import_regexes = [
                re.compile(r'import\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]'),
                re.compile(r'require\(\s*[\'"]([^\'"]+)[\'"]\s*\)')
            ]
            for line in code_content.splitlines():
                line = line.strip()
                for regex in import_regexes:
                    match = regex.search(line)
                    if match:
                        dependencies.add(match.group(1))
        
        return dependencies

    def scan_repository(self) -> Dict[str, Any]:
        """Walks the repo to parse file complexities, imports, and duplicate structures."""
        file_metrics = {}
        all_code_blocks = {} # hash -> List of (filepath, start_line)
        
        # Scan files
        for root, dirs, files in os.walk(self.repo_dir):
            # Prune directories in-place to prevent scanning dependencies or git directories
            dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'venv', '.venv', '__pycache__', 'dist', 'build')]
            for file in files:
                if not file.endswith(('.py', '.js', '.jsx', '.ts', '.tsx')):
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.repo_dir).replace('\\', '/')
                
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                except Exception:
                    continue

                # Lines of code
                loc = len(content.splitlines())
                
                # Complexity
                if file.endswith('.py'):
                    comp = self.calculate_python_complexity(content)
                else:
                    comp = self.calculate_js_complexity(content)
                
                # Dependencies
                deps = self.extract_dependencies(rel_path, content)
                
                file_metrics[rel_path] = {
                    "loc": loc,
                    "max_complexity": comp["max_complexity"],
                    "avg_complexity": comp["avg_complexity"],
                    "complexity_rank": comp["complexity_rank"],
                    "dependencies": list(deps),
                    "duplicate_lines": 0
                }

                # Duplicate Detection Line Processing (sliding window of 6 lines)
                cleaned_lines = []
                for line in content.splitlines():
                    cleaned = re.sub(r'\s+', '', line) # Remove whitespace
                    if len(cleaned) > 5: # Only consider non-trivial lines
                        cleaned_lines.append(cleaned)
                
                window_size = 6
                for i in range(len(cleaned_lines) - window_size + 1):
                    window = "".join(cleaned_lines[i:i+window_size])
                    win_hash = hashlib.md5(window.encode('utf-8')).hexdigest()
                    if win_hash not in all_code_blocks:
                        all_code_blocks[win_hash] = []
                    all_code_blocks[win_hash].append((rel_path, i))

        # Calculate Duplicate Code
        duplicates_report = []
        for win_hash, locations in all_code_blocks.items():
            if len(locations) > 1:
                # We have a clone!
                duplicates_report.append({
                    "hash": win_hash,
                    "occurrences": [{"file": loc[0], "line": loc[1]} for loc in locations]
                })
                # Add duplicate line count penalty to files
                for loc in locations:
                    file_metrics[loc[0]]["duplicate_lines"] += 6

        return {
            "files": file_metrics,
            "duplicates": duplicates_report
        }
