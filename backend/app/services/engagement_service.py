"""
Engagement Service
Analyzes content and returns a score from 0-100.
"""

import re
import logging

logger = logging.getLogger(__name__)

class EngagementService:
    """Service to calculate engagement scores based on rules"""
    
    @staticmethod
    def calculate_score(caption: str, hashtags: str, cta: str) -> int:
        """
        Calculates a heuristic score (0-100) based on:
        - Caption length (optimal 100-500 chars)
        - Emoji count (at least 2-3)
        - Hashtag count (3-10)
        - CTA presence
        """
        score = 0
        
        # 1. Caption length (max 30 points)
        length = len(caption)
        if 100 <= length <= 500:
            score += 30
        elif 50 <= length < 100 or 500 < length <= 1000:
            score += 15
        
        # 2. Emoji count (max 20 points)
        # Simple emoji detection (non-ascii)
        emoji_pattern = re.compile(r'[^\x00-\x7F]+')
        emojis = emoji_pattern.findall(caption)
        if 2 <= len(emojis) <= 10:
            score += 20
        elif len(emojis) > 0:
            score += 10
            
        # 3. Hashtag count (max 25 points)
        hashtag_count = len(hashtags.split())
        if 3 <= hashtag_count <= 10:
            score += 25
        elif 0 < hashtag_count < 3 or 10 < hashtag_count <= 20:
            score += 15
            
        # 4. CTA presence (max 25 points)
        if cta and len(cta.strip()) > 5:
            score += 25
        elif cta:
            score += 10
            
        return min(max(score, 0), 100)

# Singleton instance
engagement_service = EngagementService()
