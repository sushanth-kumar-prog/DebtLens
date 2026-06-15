import os
import re
import tempfile
import shutil
from typing import Dict, Any, List
from git import Repo, NULL_TREE

# Simple non-technical analogy:
# Imagine this service as a history detective. It looks through the library's logbook (Git history)
# to see who checked out which books, how many times a page was rewritten, and how many times
# mistakes were reported on those pages.

class GitAnalyzer:
    def __init__(self, repo_path_or_url: str):
        self.repo_path_or_url = repo_path_or_url
        self.is_remote = repo_path_or_url.startswith(("http://", "https://", "git@"))
        self.local_path = None
        self.repo = None

    def initialize(self):
        """Clone remote repo or open local repository."""
        if self.is_remote:
            self.local_path = tempfile.mkdtemp(prefix="debtlens_")
            print(f"Cloning remote repo: {self.repo_path_or_url} to {self.local_path}")
            self.repo = Repo.clone_from(self.repo_path_or_url, self.local_path)
        else:
            self.local_path = self.repo_path_or_url
            if not os.path.exists(self.local_path):
                raise ValueError(f"Path does not exist: {self.local_path}")
            self.repo = Repo(self.local_path)

    def analyze_history(self) -> Dict[str, Dict[str, Any]]:
        """
        Analyze git history to calculate churn, bug correlation, and author statistics per file.
        """
        if not self.repo:
            self.initialize()

        file_stats = {}
        bug_keywords = re.compile(r'\b(fix|bug|issue|revert|error|crash|fail)\b', re.IGNORECASE)

        # Iterate through the last 100 commits to guarantee fast response times
        for commit in self.repo.iter_commits(max_count=100):
            message = commit.message
            author = commit.author.name
            is_bug = bool(bug_keywords.search(message))

            # Find the parent commit to see what files changed
            parent = commit.parents[0] if commit.parents else None
            
            if parent:
                diffs = parent.diff(commit)
                for diff in diffs:
                    filepath = diff.b_path or diff.a_path
                    if not filepath:
                        continue
                    if any(x in filepath for x in ('node_modules/', 'venv/', '.git/', 'dist/', 'build/')):
                        continue
                    if not filepath.endswith(('.py', '.js', '.jsx', '.ts', '.tsx')):
                        continue

                    if filepath not in file_stats:
                        file_stats[filepath] = {
                            "churn": 0,
                            "bug_commits": 0,
                            "authors": {},
                            "reverts": 0,
                            "total_commits": 0
                        }

                    stats = file_stats[filepath]
                    stats["churn"] += 1
                    stats["total_commits"] += 1
                    if is_bug:
                        stats["bug_commits"] += 1
                    if "revert" in message.lower():
                        stats["reverts"] += 1
                    stats["authors"][author] = stats["authors"].get(author, 0) + 1
            else:
                # First commit: traverse the commit tree to find all tracked files
                for entry in commit.tree.traverse():
                    if entry.type == 'blob':
                        filepath = entry.path
                        if any(x in filepath for x in ('node_modules/', 'venv/', '.git/', 'dist/', 'build/')):
                            continue
                        if not filepath.endswith(('.py', '.js', '.jsx', '.ts', '.tsx')):
                            continue

                        if filepath not in file_stats:
                            file_stats[filepath] = {
                                "churn": 0,
                                "bug_commits": 0,
                                "authors": {},
                                "reverts": 0,
                                "total_commits": 0
                            }

                        stats = file_stats[filepath]
                        stats["churn"] += 1
                        stats["total_commits"] += 1
                        if is_bug:
                            stats["bug_commits"] += 1
                        if "revert" in message.lower():
                            stats["reverts"] += 1
                        stats["authors"][author] = stats["authors"].get(author, 0) + 1

        # Calculate final aggregated metrics (Bus Factor, Knowledge Concentration)
        processed_stats = {}
        for filepath, data in file_stats.items():
            authors = data["authors"]
            total_file_commits = sum(authors.values())
            
            # Sort authors by contribution count
            sorted_authors = sorted(authors.items(), key=lambda x: x[1], reverse=True)
            
            # Bus Factor estimation: How many top authors account for >80% of changes
            running_sum = 0
            bus_factor = 0
            for auth, count in sorted_authors:
                running_sum += count
                bus_factor += 1
                if running_sum / total_file_commits >= 0.8:
                    break

            primary_author = sorted_authors[0][0] if sorted_authors else "Unknown"
            primary_author_pct = (sorted_authors[0][1] / total_file_commits) if sorted_authors else 0.0

            processed_stats[filepath] = {
                "filepath": filepath,
                "churn": data["churn"],
                "bug_commits": data["bug_commits"],
                "reverts": data["reverts"],
                "bus_factor": bus_factor,
                "primary_author": primary_author,
                "knowledge_concentration": primary_author_pct,
                "total_authors": len(authors)
            }

        return processed_stats

    def cleanup(self):
        """Remove temporary cloned repository files if any."""
        if self.is_remote and self.local_path and os.path.exists(self.local_path):
            print(f"Cleaning up directory: {self.local_path}")
            shutil.rmtree(self.local_path, ignore_errors=True)
