"""
Password Reset Token Model
Stores password reset tokens with expiration
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import secrets


class PasswordResetToken(BaseModel):
    """
    Password reset token model
    
    Attributes:
        token: Unique reset token
        user_id: User ID requesting reset
        email: User email
        expires_at: Token expiration timestamp
        is_used: Whether token has been used
        created_at: Token creation timestamp
    """
    
    token: str = Field(..., description="Unique reset token")
    user_id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email")
    expires_at: datetime = Field(..., description="Token expiration")
    is_used: bool = Field(default=False, description="Token usage status")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def get_expiration(hours: int = 1) -> datetime:
        """Get expiration datetime (default 1 hour from now)"""
        return datetime.utcnow() + timedelta(hours=hours)
    
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at


class PasswordResetTokenInDB(PasswordResetToken):
    """Password reset token as stored in database"""
    id: Optional[str] = Field(alias="_id", default=None)


class EmailVerificationToken(BaseModel):
    """
    Email verification token model
    
    Attributes:
        token: Unique verification token
        user_id: User ID
        email: User email
        expires_at: Token expiration timestamp
        is_used: Whether token has been used
        created_at: Token creation timestamp
    """
    
    token: str = Field(..., description="Unique verification token")
    user_id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email")
    expires_at: datetime = Field(..., description="Token expiration")
    is_used: bool = Field(default=False, description="Token usage status")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def get_expiration(hours: int = 24) -> datetime:
        """Get expiration datetime (default 24 hours from now)"""
        return datetime.utcnow() + timedelta(hours=hours)
    
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at


class EmailVerificationTokenInDB(EmailVerificationToken):
    """Email verification token as stored in database"""
    id: Optional[str] = Field(alias="_id", default=None)
