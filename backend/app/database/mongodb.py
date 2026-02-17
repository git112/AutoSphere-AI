"""
MongoDB Module
Handles database interactions for the AI Composer.
"""

import logging
from app.database.connection import get_db

logger = logging.getLogger(__name__)

class MongoDB:
    """Helper class for database operations"""
    
    @property
    def db(self):
        return get_db()
    
    @property
    def posts(self):
        return self.db["posts"]
    
    @property
    def users(self):
        return self.db["users"]

# Singleton instance
mongodb = MongoDB()
