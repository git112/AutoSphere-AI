"""
Encryption Utilities
Handles encryption and decryption of sensitive data like API keys
"""

import os
from cryptography.fernet import Fernet
import base64
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self):
        """Initialize encryption service with key from environment"""
        encryption_key = os.getenv("ENCRYPTION_KEY")
        
        if not encryption_key:
            # Generate a key for development (DO NOT use in production)
            logger.warning("ENCRYPTION_KEY not found. Generating temporary key.")
            encryption_key = Fernet.generate_key().decode()
            logger.warning(f"Generated key: {encryption_key}")
            logger.warning("Add this to your .env file as ENCRYPTION_KEY")
        
        # Ensure key is bytes
        if isinstance(encryption_key, str):
            encryption_key = encryption_key.encode()
        
        self.cipher = Fernet(encryption_key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Encrypted string (base64 encoded)
        """
        try:
            encrypted_bytes = self.cipher.encrypt(plaintext.encode())
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt encrypted string
        
        Args:
            encrypted_text: Encrypted string to decrypt
            
        Returns:
            Decrypted plaintext string
        """
        try:
            decrypted_bytes = self.cipher.decrypt(encrypted_text.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise


# Singleton instance
encryption_service = EncryptionService()


def encrypt_api_key(api_key: str) -> str:
    """
    Encrypt an API key
    
    Args:
        api_key: API key to encrypt
        
    Returns:
        Encrypted API key
    """
    return encryption_service.encrypt(api_key)


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Decrypt an API key
    
    Args:
        encrypted_key: Encrypted API key
        
    Returns:
        Decrypted API key
    """
    return encryption_service.decrypt(encrypted_key)
