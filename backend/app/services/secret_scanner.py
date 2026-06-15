import re
import os
from typing import List, Dict, Any
from git import Repo

# Simple non-technical analogy:
# Imagine this service as a digital security guard inspecting historical building logs.
# It reads through all historical records (Git commit logs) to verify if anyone ever wrote down
# passwords, safe combinations, or credit card numbers, even if they later crossed them out or erased them.

class SecretScanner:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        # Comprehensive secret signatures
        self.rules = {
            "AWS Access Key": re.compile(r'\b(AKIA|ASCA|AIDA|AROA)[A-Z0-9]{16}\b'),
            "AWS Secret Key": re.compile(r'[^A-Za-z0-9/+=]([A-Za-z0-9/+=]{40})[^A-Za-z0-9/+=]'), # Contextual validation is done after
            "Stripe Secret Key": re.compile(r'\b(sk|rk)_(live|test)_[0-9a-zA-Z]{24,34}\b'),
            "OpenAI API Key": re.compile(r'\b(sk-[a-zA-Z0-9]{20,50}|sk-proj-[a-zA-Z0-9-_]{40,80})\b'),
            "Anthropic API Key": re.compile(r'\bsk-ant-api03-[a-zA-Z0-9-_]{80,100}\b'),
            "Slack Webhook": re.compile(r'https://hooks\.slack\.com/services/T[a-zA-Z0-9_]+/B[a-zA-Z0-9_]+/[a-zA-Z0-9_]+'),
            "Generic Private Key": re.compile(r'-----BEGIN [A-Z]+ PRIVATE KEY-----')
        }

    def scan_git_history(self) -> List[Dict[str, Any]]:
        """Scan commit diffs for secrets checked in historically."""
        leaks = []
        try:
            repo = Repo(self.repo_path)
        except Exception:
            return leaks

        # Scan commits in reverse chronological order
        for commit in repo.iter_commits():
            parent = commit.parents[0] if commit.parents else None
            
            if parent:
                diffs = parent.diff(commit, create_patch=True)
                for diff in diffs:
                    patch_str = diff.diff.decode('utf-8', errors='ignore')
                    lines = patch_str.splitlines()
                    filepath = diff.b_path or diff.a_path
                    if not filepath:
                        continue
                    if any(x in filepath for x in ('node_modules/', 'venv/', '.git/', 'dist/', 'build/')):
                        continue

                    for line_num, line in enumerate(lines):
                        if not line.startswith('+') or line.startswith('+++'):
                            continue
                        
                        cleaned_line = line[1:].strip()
                        for name, pattern in self.rules.items():
                            match = pattern.search(cleaned_line)
                            if match:
                                if name == "AWS Secret Key" and not re.search(r'(aws|secret|key|access)', cleaned_line, re.IGNORECASE):
                                    continue
                                leaks.append({
                                    "secret_type": name,
                                    "filepath": filepath,
                                    "commit_sha": commit.hexsha[:8],
                                    "author": commit.author.name,
                                    "snippet": cleaned_line[:60] + "...",
                                    "date": commit.committed_datetime.isoformat()
                                })
            else:
                # First commit: scan entire files in the tree directly
                for entry in commit.tree.traverse():
                    if entry.type == 'blob':
                        filepath = entry.path
                        if any(x in filepath for x in ('node_modules/', 'venv/', '.git/', 'dist/', 'build/')):
                            continue
                        
                        try:
                            content = entry.data_stream.read().decode('utf-8', errors='ignore')
                            for line in content.splitlines():
                                cleaned_line = line.strip()
                                for name, pattern in self.rules.items():
                                    match = pattern.search(cleaned_line)
                                    if match:
                                        if name == "AWS Secret Key" and not re.search(r'(aws|secret|key|access)', cleaned_line, re.IGNORECASE):
                                            continue
                                        leaks.append({
                                            "secret_type": name,
                                            "filepath": filepath,
                                            "commit_sha": commit.hexsha[:8],
                                            "author": commit.author.name,
                                            "snippet": cleaned_line[:60] + "...",
                                            "date": commit.committed_datetime.isoformat()
                                        })
                        except Exception:
                            continue
        
        return leaks
