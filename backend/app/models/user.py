"""
User Model
Defines user schema with AI mode configuration
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime


class User(BaseModel):
    """
    User model with AI configuration and authentication
    
    Attributes:
        user_id: Unique user identifier
        email: User email address
        name: User full name
        password_hash: Hashed password (not returned in API responses)
        is_email_verified: Email verification status
        is_active: Account active status
        ai_mode: AI key mode - 'default' uses system key, 'custom' uses user's key
        encrypted_api_key: User's encrypted API key (only if ai_mode is 'custom')
        ai_provider: Preferred AI provider (openai or ollama)
        last_login: Last login timestamp
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    
    user_id: str = Field(..., description="Unique user identifier")
    email: EmailStr = Field(..., description="User email address")
    name: str = Field(..., description="User full name")
    password_hash: str = Field(..., description="Hashed password", exclude=True)
    is_email_verified: bool = Field(default=False, description="Email verification status")
    is_active: bool = Field(default=True, description="Account active status")
    ai_mode: Literal["default", "custom"] = Field(
        default="default",
        description="AI key mode: 'default' or 'custom'"
    )
    encrypted_api_key: Optional[str] = Field(
        default=None,
        description="Encrypted API key (only for custom mode)"
    )
    ai_provider: Literal["openai", "gemini", "ollama"] = Field(
        default="gemini",
        description="Preferred AI provider"
    )
    last_login: Optional[datetime] = Field(default=None, description="Last login timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "email": "user@example.com",
                "name": "John Doe",
                "is_email_verified": True,
                "is_active": True,
                "ai_mode": "default",
                "ai_provider": "openai",
                "encrypted_api_key": None
            }
        }


class UserInDB(User):
    """User model as stored in database"""
    id: Optional[str] = Field(alias="_id", default=None)


class UserPublic(BaseModel):
    """User model for public API responses (excludes sensitive data)"""
    user_id: str
    email: EmailStr
    name: str
    is_email_verified: bool
    is_active: bool
    ai_mode: Literal["default", "custom"]
    ai_provider: Literal["openai", "gemini", "ollama"]
    created_at: datetime
