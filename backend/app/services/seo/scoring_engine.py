"""
Scoring Engine Service
Calculates weighted SEO score from dimension scores.
"""

import logging
from typing import Dict, List
from app.models.seo import DimensionScore

logger = logging.getLogger(__name__)


# Weight configuration
WEIGHTS = {
    "keyword_score": 0.30,
    "content_quality": 0.25,
    "structure_score": 0.20,
    "readability_score": 0.15,
    "intent_match": 0.10,
}

# Human-friendly names
DIMENSION_NAMES = {
    "keyword_score": "Keyword Relevance",
    "content_quality": "Engagement Quality",
    "structure_score": "Content Structure",
    "readability_score": "Readability",
    "intent_match": "Search Intent",
}


class ScoringEngine:
    """Computes weighted SEO score from individual dimension scores."""

    def calculate(self, analysis: Dict) -> Dict:
        """
        Calculate the overall SEO score and return dimension breakdown.
        
        Args:
            analysis: Output from SEOAnalyzer.analyze()
        
        Returns:
            Dict with seo_score (int 0-100) and dimension_scores (list of DimensionScore)
        """
        dimension_scores: List[DimensionScore] = []
        weighted_total = 0.0

        for key, weight in WEIGHTS.items():
            dim_data = analysis.get(key, {})
            score = dim_data.get("score", 0)
            details = dim_data.get("details", "")

            dimension_scores.append(
                DimensionScore(
                    name=DIMENSION_NAMES.get(key, key),
                    score=score,
                    details=details,
                )
            )

            weighted_total += score * weight

        seo_score = min(100, max(0, int(round(weighted_total))))

        return {
            "seo_score": seo_score,
            "dimension_scores": dimension_scores,
        }


scoring_engine = ScoringEngine()
