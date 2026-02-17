"""
Encryption Service
Handles secure encryption and decryption of user API keys.
Wraps the core encryption utility.
"""

import logging
from app.utils.encryption import encrypt_api_key, decrypt_api_key

logger = logging.getLogger(__name__)

class EncryptionService:
    """Service to handle BYOK encryption requirements"""
    
    @staticmethod
    def encrypt_key(api_key: str) -> str:
        """Encrypts an API key for storage"""
        if not api_key:
            raise ValueError("API key cannot be empty")
        return encrypt_api_key(api_key)

    @staticmethod
    def decrypt_key(encrypted_key: str) -> str:
        """Decrypts an API key for use"""
        if not encrypted_key:
            raise ValueError("Encrypted key cannot be empty")
        return decrypt_api_key(encrypted_key)

# Singleton instance
encryption_service = EncryptionService()
