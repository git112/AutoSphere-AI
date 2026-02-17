"""
Authentication Service
Handles user authentication operations
"""

from typing import Optional, Tuple
from datetime import datetime
import uuid
import logging

from app.models.user import User, UserInDB, UserPublic
from app.models.token import (
    PasswordResetToken,
    PasswordResetTokenInDB,
    EmailVerificationToken,
    EmailVerificationTokenInDB
)
from app.database import get_db
from app.utils.password import password_service
from app.utils.jwt import jwt_service
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication operations"""
    
    async def signup(self, email: str, password: str, name: str) -> Tuple[Optional[User], Optional[str]]:
        """
        Register a new user
        
        Args:
            email: User email
            password: User password
            name: User name
            
        Returns:
            Tuple of (User, error_message)
        """
        try:
            db = get_db()
            users_collection = db["users"]
            
            # Check if user already exists
            existing_user = await users_collection.find_one({"email": email})
            if existing_user:
                return None, "User with this email already exists"
            
            # Generate user ID
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            
            # Hash password
            password_hash = password_service.hash_password(password)
            
            # Create user document
            user_dict = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "password_hash": password_hash,
                "is_email_verified": False,
                "is_active": True,
                "ai_mode": "default",
                "ai_provider": "gemini",
                "encrypted_api_key": None,
                "last_login": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert user
            await users_collection.insert_one(user_dict)
            
            # Create email verification token
            verification_token = await self.create_email_verification_token(user_id, email)
            
            # Send welcome email with verification link
            email_service.send_welcome_email(email, name, verification_token)
            
            logger.info(f"User {user_id} registered successfully")
            
            # Return user (without password hash)
            user = User(**user_dict)
            return user, None
            
        except Exception as e:
            logger.error(f"Signup failed: {e}")
            return None, f"Signup failed: {str(e)}"
    
    async def login(self, email: str, password: str) -> Tuple[Optional[dict], Optional[str]]:
        """
        Authenticate user and generate tokens
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Tuple of (auth_data, error_message)
        """
        try:
            db = get_db()
            users_collection = db["users"]
            
            # Find user
            user_doc = await users_collection.find_one({"email": email})
            if not user_doc:
                return None, "Invalid email or password"
            
            user = User(**user_doc)
            
            # Verify password
            if not password_service.verify_password(password, user.password_hash):
                return None, "Invalid email or password"
            
            # Check if account is active
            if not user.is_active:
                return None, "Account is deactivated"
            
            # Update last login
            await users_collection.update_one(
                {"user_id": user.user_id},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            # Generate tokens
            access_token = jwt_service.create_access_token(user.user_id, user.email)
            refresh_token = jwt_service.create_refresh_token(user.user_id, user.email)
            
            # Prepare user data (exclude sensitive fields)
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
            
            logger.info(f"User {user.user_id} logged in successfully")
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user_public.model_dump()
            }, None
            
        except Exception as e:
            logger.error(f"Login failed: {e}")
            return None, f"Login failed: {str(e)}"
    
    async def create_password_reset_token(self, email: str) -> Optional[str]:
        """
        Create password reset token
        
        Args:
            email: User email
            
        Returns:
            Reset token if successful, None otherwise
        """
        try:
            db = get_db()
            users_collection = db["users"]
            tokens_collection = db["password_reset_tokens"]
            
            # Find user
            user_doc = await users_collection.find_one({"email": email})
            if not user_doc:
                # Don't reveal if user exists
                logger.warning(f"Password reset requested for non-existent email: {email}")
                return None
            
            user = User(**user_doc)
            
            # Generate token
            token = PasswordResetToken.generate_token()
            expires_at = PasswordResetToken.get_expiration(hours=1)
            
            # Create token document
            token_dict = {
                "token": token,
                "user_id": user.user_id,
                "email": email,
                "expires_at": expires_at,
                "is_used": False,
                "created_at": datetime.utcnow()
            }
            
            # Insert token
            await tokens_collection.insert_one(token_dict)
            
            # Send password reset email
            email_service.send_password_reset_email(email, user.name, token)
            
            logger.info(f"Password reset token created for user {user.user_id}")
            
            return token
            
        except Exception as e:
            logger.error(f"Failed to create password reset token: {e}")
            return None
    
    async def reset_password(self, token: str, new_password: str) -> Tuple[bool, Optional[str]]:
        """
        Reset password using token
        
        Args:
            token: Password reset token
            new_password: New password
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            db = get_db()
            tokens_collection = db["password_reset_tokens"]
            users_collection = db["users"]
            
            # Find token
            token_doc = await tokens_collection.find_one({"token": token})
            if not token_doc:
                return False, "Invalid or expired token"
            
            reset_token = PasswordResetToken(**token_doc)
            
            # Check if token is used
            if reset_token.is_used:
                return False, "Token has already been used"
            
            # Check if token is expired
            if reset_token.is_expired():
                return False, "Token has expired"
            
            # Hash new password
            password_hash = password_service.hash_password(new_password)
            
            # Update user password
            await users_collection.update_one(
                {"user_id": reset_token.user_id},
                {"$set": {"password_hash": password_hash, "updated_at": datetime.utcnow()}}
            )
            
            # Mark token as used
            await tokens_collection.update_one(
                {"token": token},
                {"$set": {"is_used": True}}
            )
            
            logger.info(f"Password reset successful for user {reset_token.user_id}")
            
            return True, None
            
        except Exception as e:
            logger.error(f"Password reset failed: {e}")
            return False, f"Password reset failed: {str(e)}"
    
    async def create_email_verification_token(self, user_id: str, email: str) -> Optional[str]:
        """
        Create email verification token
        
        Args:
            user_id: User ID
            email: User email
            
        Returns:
            Verification token if successful
        """
        try:
            db = get_db()
            tokens_collection = db["email_verification_tokens"]
            
            # Generate token
            token = EmailVerificationToken.generate_token()
            expires_at = EmailVerificationToken.get_expiration(hours=24)
            
            # Create token document
            token_dict = {
                "token": token,
                "user_id": user_id,
                "email": email,
                "expires_at": expires_at,
                "is_used": False,
                "created_at": datetime.utcnow()
            }
            
            # Insert token
            await tokens_collection.insert_one(token_dict)
            
            logger.info(f"Email verification token created for user {user_id}")
            
            return token
            
        except Exception as e:
            logger.error(f"Failed to create email verification token: {e}")
            return None
    
    async def verify_email(self, token: str) -> Tuple[bool, Optional[str]]:
        """
        Verify email using token
        
        Args:
            token: Email verification token
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            db = get_db()
            tokens_collection = db["email_verification_tokens"]
            users_collection = db["users"]
            
            # Find token
            token_doc = await tokens_collection.find_one({"token": token})
            if not token_doc:
                return False, "Invalid or expired token"
            
            verification_token = EmailVerificationToken(**token_doc)
            
            # Check if token is used
            if verification_token.is_used:
                return False, "Token has already been used"
            
            # Check if token is expired
            if verification_token.is_expired():
                return False, "Token has expired"
            
            # Update user email verification status
            await users_collection.update_one(
                {"user_id": verification_token.user_id},
                {"$set": {"is_email_verified": True, "updated_at": datetime.utcnow()}}
            )
            
            # Mark token as used
            await tokens_collection.update_one(
                {"token": token},
                {"$set": {"is_used": True}}
            )
            
            logger.info(f"Email verified for user {verification_token.user_id}")
            
            return True, None
            
        except Exception as e:
            logger.error(f"Email verification failed: {e}")
            return False, f"Email verification failed: {str(e)}"
    
    async def refresh_access_token(self, refresh_token: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Generate new access token using refresh token
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            Tuple of (new_access_token, error_message)
        """
        try:
            # Verify refresh token
            payload = jwt_service.verify_token(refresh_token, token_type="refresh")
            if not payload:
                return None, "Invalid or expired refresh token"
            
            user_id = payload.get("sub")
            email = payload.get("email")
            
            # Generate new access token
            access_token = jwt_service.create_access_token(user_id, email)
            
            logger.info(f"Access token refreshed for user {user_id}")
            
            return access_token, None
            
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return None, f"Token refresh failed: {str(e)}"


# Singleton instance
auth_service = AuthService()
