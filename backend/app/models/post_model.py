"""
Post Model
Defines the structure for generated content and drafts.
"""

from pydantic import BaseModel, Field
from typing import Dict, Optional, Literal
from datetime import datetime

class PostFormattedContent(BaseModel):
    """Platform-specific formatted content"""
    instagram: str
    linkedin: str
    twitter: Optional[str] = None

class Post(BaseModel):
    """
    Main Post/Draft model
    """
    post_id: Optional[str] = Field(None, alias="_id")
    user_id: str
    topic: str
    platform: str
    tone: str
    goal: str
    caption: str
    hashtags: str
    cta: str
    formatted: PostFormattedContent
    image_url: Optional[str] = None
    engagement_score_estimate: int = Field(0, ge=0, le=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = None
    status: Literal["draft", "scheduled", "published", "generated"] = "generated"
    is_draft: bool = True

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "topic": "AI in 2024",
                "platform": "instagram",
                "tone": "professional",
                "goal": "engagement",
                "caption": "Exploring AI trends...",
                "hashtags": "#AI #Tech",
                "cta": "Link in bio",
                "formatted": {
                    "instagram": "Exploring AI trends... \n\n#AI #Tech",
                    "linkedin": "Exploring AI trends... \n\n#AI #Tech",
                    "twitter": "Exploring AI trends... #AI #Tech"
                },
                "engagement_score_estimate": 85,
                "is_draft": True
            }
        }
