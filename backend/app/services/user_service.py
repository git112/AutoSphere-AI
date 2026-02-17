"""
User Service
Handles user operations and API key management
"""

from typing import Optional
import logging
from app.models.user import User, UserInDB
from app.database import get_db
from app.utils.encryption import encrypt_api_key, decrypt_api_key

logger = logging.getLogger(__name__)


class UserService:
    """Service for managing users"""
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """
        Get user by ID
        
        Args:
            user_id: User ID
            
        Returns:
            User if found, None otherwise
        """
        try:
            db = get_db()
            users_collection = db["users"]
            
            user = await users_collection.find_one({"user_id": user_id})
            
            if user:
                return User(**user)
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve user {user_id}: {e}")
            raise
    
    async def get_user_api_key(self, user_id: str) -> Optional[str]:
        """
        Get decrypted API key for user
        
        Args:
            user_id: User ID
            
        Returns:
            Decrypted API key if user has custom mode, None otherwise
        """
        try:
            user = await self.get_user(user_id)
            
            if not user:
                return None
            
            if user.ai_mode == "custom" and user.encrypted_api_key:
                return decrypt_api_key(user.encrypted_api_key)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve API key for user {user_id}: {e}")
            raise
    
    async def update_user_api_key(self, user_id: str, api_key: str) -> bool:
        """
        Update user's API key
        
        Args:
            user_id: User ID
            api_key: New API key (will be encrypted)
            
        Returns:
            True if successful
        """
        try:
            db = get_db()
            users_collection = db["users"]
            
            encrypted_key = encrypt_api_key(api_key)
            
            result = await users_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "encrypted_api_key": encrypted_key,
                        "ai_mode": "custom"
                    }
                }
            )
            
            logger.info(f"Updated API key for user {user_id}")
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update API key for user {user_id}: {e}")
            raise


# Singleton instance
user_service = UserService()
