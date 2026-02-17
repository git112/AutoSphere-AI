"""
Authentication Routes
API endpoints for user authentication
"""

from fastapi import APIRouter, HTTPException, status, Header
from typing import Optional
import logging

from app.models.auth import (
    SignupRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    AuthResponse,
    TokenResponse,
    RefreshTokenRequest
)
from app.models.user import UserPublic
from app.services.auth_service import auth_service
from app.utils.jwt import jwt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest):
    """
    Register a new user
    
    This endpoint:
    1. Validates user input (email, password strength, name)
    2. Checks if user already exists
    3. Hashes password securely
    4. Creates user account
    5. Sends welcome email with verification link
    
    Args:
        request: Signup request with email, password, and name
        
    Returns:
        Success response with user data
    """
    try:
        user, error = await auth_service.signup(
            email=request.email,
            password=request.password,
            name=request.name
        )
        
        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        # Prepare user data for response
        user_public = UserPublic(
            user_id=user.user_id,
            email=user.email,
            name=user.name,
            is_email_verified=user.is_email_verified,
            is_active=user.is_active,
            ai_mode=user.ai_mode,
            ai_provider=user.ai_provider,
            created_at=user.created_at
        )
        
        logger.info(f"User {user.user_id} signed up successfully")
        
        return AuthResponse(
            success=True,
            message="Account created successfully. Please check your email to verify your account.",
            user=user_public.model_dump()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and generate tokens
    
    This endpoint:
    1. Validates credentials
    2. Checks account status
    3. Generates JWT access and refresh tokens
    4. Updates last login timestamp
    
    Args:
        request: Login request with email and password
        
    Returns:
        Success response with tokens and user data
    """
    try:
        auth_data, error = await auth_service.login(
            email=request.email,
            password=request.password
        )
        
        if error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error
            )
        
        logger.info(f"User logged in successfully: {request.email}")
        
        return AuthResponse(
            success=True,
            message="Login successful",
            access_token=auth_data["access_token"],
            refresh_token=auth_data["refresh_token"],
            user=auth_data["user"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/forgot-password", response_model=AuthResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """
    Request password reset
    
    This endpoint:
    1. Validates email exists
    2. Generates password reset token
    3. Sends password reset email with link
    
    Args:
        request: Forgot password request with email
        
    Returns:
        Success response (always, for security)
    """
    try:
        # Always return success to prevent email enumeration
        await auth_service.create_password_reset_token(request.email)
        
        logger.info(f"Password reset requested for: {request.email}")
        
        return AuthResponse(
            success=True,
            message="If an account exists with this email, you will receive password reset instructions."
        )
        
    except Exception as e:
        logger.error(f"Forgot password failed: {e}")
        # Still return success for security
        return AuthResponse(
            success=True,
            message="If an account exists with this email, you will receive password reset instructions."
        )


@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using token
    
    This endpoint:
    1. Validates reset token
    2. Checks token expiration
    3. Updates user password
    4. Marks token as used
    
    Args:
        request: Reset password request with token and new password
        
    Returns:
        Success response
    """
    try:
        success, error = await auth_service.reset_password(
            token=request.token,
            new_password=request.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        logger.info("Password reset successful")
        
        return AuthResponse(
            success=True,
            message="Password reset successful. You can now login with your new password."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )


@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(request: VerifyEmailRequest):
    """
    Verify email address
    
    This endpoint:
    1. Validates verification token
    2. Checks token expiration
    3. Updates user email verification status
    4. Marks token as used
    
    Args:
        request: Email verification request with token
        
    Returns:
        Success response
    """
    try:
        success, error = await auth_service.verify_email(request.token)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        logger.info("Email verified successfully")
        
        return AuthResponse(
            success=True,
            message="Email verified successfully. You can now access all features."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email verification failed: {str(e)}"
        )


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token
    
    This endpoint:
    1. Validates refresh token
    2. Generates new access token
    
    Args:
        request: Refresh token request
        
    Returns:
        New access token
    """
    try:
        access_token, error = await auth_service.refresh_access_token(request.refresh_token)
        
        if error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error
            )
        
        logger.info("Access token refreshed successfully")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=request.refresh_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )


@router.get("/me", response_model=AuthResponse)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Get current authenticated user
    
    This endpoint:
    1. Validates access token from Authorization header
    2. Retrieves user information
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        Current user data
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        
        # Extract token
        token = authorization.replace("Bearer ", "")
        
        # Verify token
        payload = jwt_service.verify_token(token, token_type="access")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        user_id = payload.get("sub")
        
        # Get user from database
        from app.services.user_service import user_service
        user = await user_service.get_user(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prepare user data
        user_public = UserPublic(
            user_id=user.user_id,
            email=user.email,
            name=user.name,
            is_email_verified=user.is_email_verified,
            is_active=user.is_active,
            ai_mode=user.ai_mode,
            ai_provider=user.ai_provider,
            created_at=user.created_at
        )
        
        return AuthResponse(
            success=True,
            message="User retrieved successfully",
            user=user_public.model_dump()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )
