"""
Draft Model
Defines schema for AI-generated content drafts
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class Draft(BaseModel):
    """
    Draft model for AI-generated content
    
    Attributes:
        draft_id: Unique draft identifier
        user_id: User who created the draft
        topic: Content topic
        tone: Content tone (professional, casual, friendly, formal)
        platform: Target platform (linkedin, twitter, instagram, facebook)
        content: Generated content text
        hashtags: Generated hashtags
        cta: Call-to-action text
        created_at: Creation timestamp
    """
    
    draft_id: Optional[str] = Field(default=None, description="Unique draft identifier")
    user_id: str = Field(..., description="User ID who owns this draft")
    topic: str = Field(..., description="Content topic")
    tone: Literal["professional", "casual", "friendly", "formal"] = Field(
        ...,
        description="Content tone"
    )
    platform: Literal["linkedin", "twitter", "instagram", "facebook"] = Field(
        ...,
        description="Target social media platform"
    )
    content: str = Field(..., description="Generated content text")
    hashtags: Optional[str] = Field(default=None, description="Generated hashtags")
    cta: Optional[str] = Field(default=None, description="Call-to-action")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "draft_id": "draft_123",
                "user_id": "user_123",
                "topic": "AI in Marketing",
                "tone": "professional",
                "platform": "linkedin",
                "content": "AI is transforming marketing...",
                "hashtags": "#AI #Marketing #Innovation",
                "cta": "Learn more at our website"
            }
        }


class DraftInDB(Draft):
    """Draft model as stored in database"""
    id: Optional[str] = Field(alias="_id", default=None)


class DraftCreate(BaseModel):
    """Schema for creating a new draft"""
    user_id: str
    topic: str
    tone: Literal["professional", "casual", "friendly", "formal"]
    platform: Literal["linkedin", "twitter", "instagram", "facebook"]
    content: str
    hashtags: Optional[str] = None
    cta: Optional[str] = None
