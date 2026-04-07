"""
Instagram Data Models
Handles user Instagram connections and post payloads
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class InstagramAccount(BaseModel):
    """
    Instagram connected account model
    """
    user_id: str = Field(..., description="The user's ID on our platform")
    instagram_user_id: str = Field(..., description="Instagram Business Account ID from Meta")
    facebook_page_id: str = Field(..., description="Facebook Page ID linked to the Instagram account")
    access_token: str = Field(..., description="Long-lived user access token for Meta Graph API")
    token_expiry: Optional[datetime] = Field(None, description="When the access token expires")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class InstagramAccountInDB(InstagramAccount):
    """Stored representation"""
    id: Optional[str] = Field(alias="_id", default=None)

class InstagramPostRequest(BaseModel):
    """
    Model for a request to post media to Instagram
    """
    image_url: str = Field(..., description="A public, valid URL of the image to post")
    caption: Optional[str] = Field(None, description="Caption for the Instagram post")

class InstagramPostResponse(BaseModel):
    """
    Response model after a post is successful
    """
    success: bool
    message: str
    post_id: Optional[str] = None
    creation_id: Optional[str] = None
