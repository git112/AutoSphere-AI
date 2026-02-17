"""
MongoDB Database Connection Module
Handles database initialization and connection management
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import logging

logger = logging.getLogger(__name__)


class Database:
    """MongoDB database connection manager"""
    
    client: AsyncIOMotorClient = None
    database = None

    @classmethod
    async def connect_db(cls):
        """
        Establish connection to MongoDB
        
        Raises:
            ConnectionFailure: If unable to connect to MongoDB
        """
        try:
            mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
            database_name = os.getenv("DATABASE_NAME", "abga_saas")
            
            cls.client = AsyncIOMotorClient(mongodb_url)
            cls.database = cls.client[database_name]
            
            # Verify connection
            await cls.client.admin.command('ping')
            logger.info(f"Successfully connected to MongoDB: {database_name}")
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    @classmethod
    async def close_db(cls):
        """Close database connection"""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")

    @classmethod
    def get_database(cls):
        """
        Get database instance
        
        Returns:
            Database instance
        """
        return cls.database


# Convenience function to get database
def get_db():
    """Get database instance"""
    return Database.get_database()
