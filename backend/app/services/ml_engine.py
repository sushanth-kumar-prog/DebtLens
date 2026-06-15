import numpy as np
from typing import Dict, Any, List
from sklearn.preprocessing import MinMaxScaler

# Simple non-technical analogy:
# Imagine this service as a personal fitness coach for code. It gathers stats like heart rate (complexity),
# daily steps (churn), and injury history (bugs) for all the runners (files). It standardizes all metrics 
# to a common scale so it can compare them fairly, and tells you who needs training first (priority score).

class MLEngine:
    def __init__(self):
        self.scaler = MinMaxScaler()

    def calculate_priority_scores(self, files_metrics: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize file metrics and calculate prioritized technical debt score using scikit-learn.
        """
        if not files_metrics:
            return []

        filepaths = list(files_metrics.keys())
        features = []

        for path in filepaths:
            m = files_metrics[path]
            # Formulate raw features: [Complexity, Churn, Bugs, Duplicates, (1.0 - BusFactor)]
            # We invert BusFactor so a lower bus factor (higher risk) increases priority
            bus_factor = m.get("bus_factor", 1)
            inv_bus_factor = 1.0 / max(bus_factor, 1)

            features.append([
                float(m.get("max_complexity", 1)),
                float(m.get("churn", 1)),
                float(m.get("bug_commits", 0)),
                float(m.get("duplicate_lines", 0)),
                float(inv_bus_factor)
            ])

        features_matrix = np.array(features)
        
        # Scale features to 0-1 range to align weights
        scaled_features = self.scaler.fit_transform(features_matrix)

        # Define priority weights for our technical debt prioritization model
        # Complexity (25%), Churn (30%), Bugs (25%), Duplicates (10%), Bus Factor (10%)
        weights = np.array([0.25, 0.30, 0.25, 0.10, 0.10])
        
        # Calculate raw score (0.0 to 1.0)
        raw_scores = np.dot(scaled_features, weights)
        
        # Scale score to 0-100 range
        priority_scores = raw_scores * 100

        results = []
        for idx, path in enumerate(filepaths):
            m = files_metrics[path]
            p_score = round(float(priority_scores[idx]), 2)
            
            # ROI Calculations
            # Refactor ROI = Complexity reduction + Bug reduction + Onboarding ease
            # Estimate hours saved over next quarter = (churn * 0.5 hours per touch saved if code is clean)
            est_bugs_prevented = int(m.get("bug_commits", 0) * 0.4) + 1
            est_hours_saved = round(m.get("churn", 0) * 0.75, 1)

            results.append({
                "filepath": path,
                "loc": m["loc"],
                "max_complexity": m["max_complexity"],
                "avg_complexity": m["avg_complexity"],
                "complexity_rank": m["complexity_rank"],
                "churn": m["churn"],
                "bug_commits": m["bug_commits"],
                "duplicate_lines": m["duplicate_lines"],
                "bus_factor": m.get("bus_factor", 1),
                "priority_score": p_score,
                "roi_hours_saved": est_hours_saved,
                "roi_bugs_prevented": est_bugs_prevented,
                "roi_score": round((est_hours_saved * 10) / (m["loc"] + 1), 2)
            })

        # Sort files: highest priority score first
        return sorted(results, key=lambda x: x["priority_score"], reverse=True)
