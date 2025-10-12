"""
Field-level encryption for sensitive data
CRITICAL: Protects PII, salary, SSN, and other sensitive information
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
import structlog
from typing import Optional, Union

logger = structlog.get_logger()


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize encryption service
        
        Args:
            encryption_key: Base64 encoded encryption key. If None, will generate from SECRET_KEY
        """
        if encryption_key:
            self.key = encryption_key.encode()
        else:
            # Generate key from SECRET_KEY environment variable
            secret_key = os.getenv('SECRET_KEY')
            if not secret_key:
                raise ValueError("SECRET_KEY environment variable is required for encryption")
            
            # Derive encryption key from SECRET_KEY
            salt = b'hrms_encryption_salt_2024'  # Fixed salt for consistency
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            self.key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        
        self.cipher = Fernet(self.key)
    
    def encrypt(self, data: Union[str, int, float]) -> str:
        """
        Encrypt sensitive data
        
        Args:
            data: Data to encrypt (string, int, or float)
            
        Returns:
            Base64 encoded encrypted string
        """
        try:
            if data is None:
                return None
            
            # Convert to string if needed
            data_str = str(data)
            
            # Encrypt the data
            encrypted_bytes = self.cipher.encrypt(data_str.encode('utf-8'))
            
            # Return base64 encoded string
            return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise ValueError(f"Failed to encrypt data: {e}")
    
    def decrypt(self, encrypted_data: str) -> Optional[str]:
        """
        Decrypt sensitive data
        
        Args:
            encrypted_data: Base64 encoded encrypted string
            
        Returns:
            Decrypted string or None if decryption fails
        """
        try:
            if not encrypted_data:
                return None
            
            # Decode base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode('utf-8'))
            
            # Decrypt the data
            decrypted_bytes = self.cipher.decrypt(encrypted_bytes)
            
            return decrypted_bytes.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return None
    
    def encrypt_field(self, data: Union[str, int, float]) -> str:
        """Alias for encrypt method"""
        return self.encrypt(data)
    
    def decrypt_field(self, encrypted_data: str) -> Optional[str]:
        """Alias for decrypt method"""
        return self.decrypt(encrypted_data)


# Global encryption service instance
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """Get or create global encryption service instance"""
    global _encryption_service
    
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    
    return _encryption_service


def encrypt_sensitive_data(data: Union[str, int, float]) -> str:
    """
    Encrypt sensitive data using global encryption service
    
    Args:
        data: Data to encrypt
        
    Returns:
        Encrypted string
    """
    service = get_encryption_service()
    return service.encrypt(data)


def decrypt_sensitive_data(encrypted_data: str) -> Optional[str]:
    """
    Decrypt sensitive data using global encryption service
    
    Args:
        encrypted_data: Encrypted data to decrypt
        
    Returns:
        Decrypted string or None if decryption fails
    """
    service = get_encryption_service()
    return service.decrypt(encrypted_data)


# Utility functions for common sensitive fields
def encrypt_ssn(ssn: str) -> str:
    """Encrypt Social Security Number"""
    if not ssn:
        return None
    return encrypt_sensitive_data(ssn)


def decrypt_ssn(encrypted_ssn: str) -> Optional[str]:
    """Decrypt Social Security Number"""
    return decrypt_sensitive_data(encrypted_ssn)


def encrypt_salary(salary: Union[int, float, str]) -> str:
    """Encrypt salary information"""
    if salary is None:
        return None
    return encrypt_sensitive_data(salary)


def decrypt_salary(encrypted_salary: str) -> Optional[str]:
    """Decrypt salary information"""
    return decrypt_sensitive_data(encrypted_salary)


def encrypt_bank_account(bank_account: str) -> str:
    """Encrypt bank account information"""
    if not bank_account:
        return None
    return encrypt_sensitive_data(bank_account)


def decrypt_bank_account(encrypted_bank_account: str) -> Optional[str]:
    """Decrypt bank account information"""
    return decrypt_sensitive_data(encrypted_bank_account)


def encrypt_personal_id(personal_id: str) -> str:
    """Encrypt personal ID (passport, driver's license, etc.)"""
    if not personal_id:
        return None
    return encrypt_sensitive_data(personal_id)


def decrypt_personal_id(encrypted_personal_id: str) -> Optional[str]:
    """Decrypt personal ID"""
    return decrypt_sensitive_data(encrypted_personal_id)
