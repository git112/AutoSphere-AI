"""
Posting Time Service
Suggests best posting times based on platform (India Timezone).
"""

from typing import List

class PostingTimeService:
    def get_best_posting_times(self, platform: str) -> List[str]:
        p = platform.lower()
        if p == "linkedin":
            return ["08:00", "12:30", "18:00"]
        elif p == "instagram":
            return ["11:00", "19:00", "21:00"]
        elif p == "twitter":
            return ["09:00", "13:00", "20:00"]
        else:
            return ["10:00", "14:00", "18:00"]

posting_time_service = PostingTimeService()
