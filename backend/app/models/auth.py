"""
Authentication Schemas
Request and response models for authentication endpoints
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re


class SignupRequest(BaseModel):
    """User signup request"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="User password")
    name: str = Field(..., min_length=2, max_length=100, description="User full name")
    
    @validator('password')
    def validate_password(cls, v):
        """
        Validate password strength
        - At least 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class LoginRequest(BaseModel):
    """User login request"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class ForgotPasswordRequest(BaseModel):
    """Forgot password request"""
    email: EmailStr = Field(..., description="User email address")


class ResetPasswordRequest(BaseModel):
    """Reset password request"""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password")
    
    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class VerifyEmailRequest(BaseModel):
    """Email verification request"""
    token: str = Field(..., description="Email verification token")


class AuthResponse(BaseModel):
    """Authentication response"""
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[dict] = None


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str = Field(..., description="Refresh token")


# ── OTP Models (new — appended below existing models) ────────────────────────

class SendOtpRequest(BaseModel):
    """Request to send an OTP email"""
    email: EmailStr = Field(..., description="User email address")
    purpose: str = Field(..., description="'signup' or 'password_reset'")
    name: str = Field(default="User", description="User name for the email greeting")


class VerifySignupOtpRequest(BaseModel):
    """Verify OTP to activate a newly created account"""
    email: EmailStr = Field(..., description="User email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class VerifyPasswordResetOtpRequest(BaseModel):
    """Verify OTP and set a new password"""
    email: EmailStr = Field(..., description="User email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password")

    @validator('new_password')
    def validate_password(cls, v):
        """Validate new password strength"""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class CheckEmailRequest(BaseModel):
    """Check whether an email is registered"""
    email: EmailStr = Field(..., description="Email to check")


class CheckEmailResponse(BaseModel):
    """Response for check-email endpoint"""
    exists: bool

