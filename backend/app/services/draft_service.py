"""
Draft Service
Handles draft creation and retrieval
"""

from typing import List, Optional
from datetime import datetime
import uuid
import logging
from app.models.draft import Draft, DraftCreate, DraftInDB
from app.database import get_db

logger = logging.getLogger(__name__)


class DraftService:
    """Service for managing content drafts"""
    
    async def create_draft(self, draft_data: DraftCreate) -> Draft:
        """
        Create a new draft
        
        Args:
            draft_data: Draft creation data
            
        Returns:
            Created draft
        """
        try:
            db = get_db()
            drafts_collection = db["drafts"]
            
            # Generate unique draft ID
            draft_id = f"draft_{uuid.uuid4().hex[:12]}"
            
            # Create draft document
            draft_dict = draft_data.model_dump()
            draft_dict["draft_id"] = draft_id
            draft_dict["created_at"] = datetime.utcnow()
            
            # Insert into database
            result = await drafts_collection.insert_one(draft_dict)
            
            # Retrieve created draft
            created_draft = await drafts_collection.find_one({"_id": result.inserted_id})
            
            logger.info(f"Created draft {draft_id} for user {draft_data.user_id}")
            
            return Draft(**created_draft)
            
        except Exception as e:
            logger.error(f"Failed to create draft: {e}")
            raise
    
    async def get_user_drafts(self, user_id: str, limit: int = 50) -> List[Draft]:
        """
        Get all drafts for a user
        
        Args:
            user_id: User ID
            limit: Maximum number of drafts to return
            
        Returns:
            List of user's drafts
        """
        try:
            db = get_db()
            drafts_collection = db["drafts"]
            
            cursor = drafts_collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
            drafts = await cursor.to_list(length=limit)
            
            logger.info(f"Retrieved {len(drafts)} drafts for user {user_id}")
            
            return [Draft(**draft) for draft in drafts]
            
        except Exception as e:
            logger.error(f"Failed to retrieve drafts: {e}")
            raise
    
    async def get_draft_by_id(self, draft_id: str) -> Optional[Draft]:
        """
        Get a specific draft by ID
        
        Args:
            draft_id: Draft ID
            
        Returns:
            Draft if found, None otherwise
        """
        try:
            db = get_db()
            drafts_collection = db["drafts"]
            
            draft = await drafts_collection.find_one({"draft_id": draft_id})
            
            if draft:
                return Draft(**draft)
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve draft {draft_id}: {e}")
            raise


# Singleton instance
draft_service = DraftService()
