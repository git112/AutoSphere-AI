"""
JWT Token Service
Handles JWT token generation and validation
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict
import jwt
import logging

logger = logging.getLogger(__name__)


class JWTService:
    """Service for JWT token operations"""
    
    def __init__(self):
        """Initialize JWT service with secret key"""
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        
        if self.secret_key == "your-secret-key-change-in-production":
            logger.warning("Using default JWT secret key. Please set JWT_SECRET_KEY in production!")
    
    def create_access_token(self, user_id: str, email: str) -> str:
        """
        Create JWT access token
        
        Args:
            user_id: User ID
            email: User email
            
        Returns:
            JWT access token
        """
        try:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
            
            payload = {
                "sub": user_id,
                "email": email,
                "type": "access",
                "exp": expire,
                "iat": datetime.utcnow()
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
            
        except Exception as e:
            logger.error(f"Access token creation failed: {e}")
            raise
    
    def create_refresh_token(self, user_id: str, email: str) -> str:
        """
        Create JWT refresh token
        
        Args:
            user_id: User ID
            email: User email
            
        Returns:
            JWT refresh token
        """
        try:
            expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
            
            payload = {
                "sub": user_id,
                "email": email,
                "type": "refresh",
                "exp": expire,
                "iat": datetime.utcnow()
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
            
        except Exception as e:
            logger.error(f"Refresh token creation failed: {e}")
            raise
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token to verify
            token_type: Expected token type ('access' or 'refresh')
            
        Returns:
            Decoded token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Verify token type
            if payload.get("type") != token_type:
                logger.warning(f"Invalid token type. Expected {token_type}, got {payload.get('type')}")
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None
    
    def decode_token_without_verification(self, token: str) -> Optional[Dict]:
        """
        Decode token without verification (for debugging only)
        
        Args:
            token: JWT token
            
        Returns:
            Decoded payload
        """
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            logger.error(f"Token decoding failed: {e}")
            return None


# Singleton instance
jwt_service = JWTService()
