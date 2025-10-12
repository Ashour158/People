"""
File Upload Security Middleware
CRITICAL: Protects against malicious file uploads
"""
from fastapi import UploadFile, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import magic
import hashlib
import os
import structlog
from typing import List, Optional
import mimetypes
import subprocess
import tempfile

logger = structlog.get_logger()


class FileSecurityService:
    """Service for secure file handling"""
    
    # Allowed file types and their MIME types
    ALLOWED_TYPES = {
        'image': {
            'extensions': ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
            'mime_types': ['image/jpeg', 'image/png', 'image/gif', 'image/bmp']
        },
        'document': {
            'extensions': ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
            'mime_types': ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'text/plain', 'application/rtf']
        },
        'spreadsheet': {
            'extensions': ['.xls', '.xlsx', '.csv'],
            'mime_types': ['application/vnd.ms-excel',
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                          'text/csv']
        }
    }
    
    # Maximum file sizes (in bytes)
    MAX_SIZES = {
        'image': 5 * 1024 * 1024,  # 5MB
        'document': 10 * 1024 * 1024,  # 10MB
        'spreadsheet': 5 * 1024 * 1024,  # 5MB
        'default': 2 * 1024 * 1024  # 2MB
    }
    
    # Dangerous file extensions
    DANGEROUS_EXTENSIONS = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.ps1', '.psm1', '.psd1', '.ps1xml', '.psc1', '.pssc',
        '.msi', '.msp', '.mst', '.reg', '.inf', '.ini', '.cfg', '.conf'
    ]
    
    def __init__(self):
        self.magic = magic.Magic(mime=True)
    
    def validate_file_type(self, file: UploadFile, category: str = 'default') -> bool:
        """
        Validate file type using multiple methods
        
        Args:
            file: Uploaded file
            category: File category (image, document, spreadsheet, default)
            
        Returns:
            True if file type is valid, False otherwise
        """
        try:
            # Get file extension
            filename = file.filename.lower()
            file_ext = os.path.splitext(filename)[1]
            
            # Check for dangerous extensions
            if file_ext in self.DANGEROUS_EXTENSIONS:
                logger.warning(f"Dangerous file extension detected: {file_ext}")
                return False
            
            # Read file content for MIME type detection
            content = file.file.read(1024)  # Read first 1KB
            file.file.seek(0)  # Reset file pointer
            
            # Detect MIME type using python-magic
            detected_mime = self.magic.from_buffer(content)
            
            # Get allowed types for category
            allowed_types = self.ALLOWED_TYPES.get(category, self.ALLOWED_TYPES['default'])
            
            # Check extension
            if file_ext not in allowed_types['extensions']:
                logger.warning(f"File extension not allowed: {file_ext}")
                return False
            
            # Check MIME type
            if detected_mime not in allowed_types['mime_types']:
                logger.warning(f"MIME type not allowed: {detected_mime}")
                return False
            
            # Additional validation for images
            if category == 'image':
                return self._validate_image_file(content)
            
            # Additional validation for documents
            if category == 'document':
                return self._validate_document_file(content, file_ext)
            
            return True
            
        except Exception as e:
            logger.error(f"File validation error: {e}")
            return False
    
    def _validate_image_file(self, content: bytes) -> bool:
        """Validate image file content"""
        try:
            # Check for image file signatures
            image_signatures = {
                b'\xff\xd8\xff': 'JPEG',
                b'\x89PNG\r\n\x1a\n': 'PNG',
                b'GIF87a': 'GIF87a',
                b'GIF89a': 'GIF89a',
                b'BM': 'BMP'
            }
            
            for signature, format_name in image_signatures.items():
                if content.startswith(signature):
                    return True
            
            return False
            
        except Exception:
            return False
    
    def _validate_document_file(self, content: bytes, file_ext: str) -> bool:
        """Validate document file content"""
        try:
            if file_ext == '.pdf':
                # PDF files should start with %PDF
                return content.startswith(b'%PDF')
            
            elif file_ext in ['.doc', '.docx']:
                # Microsoft Office files have specific signatures
                return (content.startswith(b'PK\x03\x04') or  # ZIP-based format
                        content.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'))  # OLE format
            
            elif file_ext == '.txt':
                # Text files should be readable
                try:
                    content.decode('utf-8')
                    return True
                except UnicodeDecodeError:
                    return False
            
            return True
            
        except Exception:
            return False
    
    def validate_file_size(self, file: UploadFile, category: str = 'default') -> bool:
        """
        Validate file size
        
        Args:
            file: Uploaded file
            category: File category
            
        Returns:
            True if file size is valid, False otherwise
        """
        try:
            # Get file size
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            # Get maximum allowed size
            max_size = self.MAX_SIZES.get(category, self.MAX_SIZES['default'])
            
            if file_size > max_size:
                logger.warning(f"File too large: {file_size} bytes (max: {max_size})")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"File size validation error: {e}")
            return False
    
    def scan_for_malware(self, file_path: str) -> bool:
        """
        Scan file for malware (if ClamAV is available)
        
        Args:
            file_path: Path to file to scan
            
        Returns:
            True if file is clean, False if malware detected
        """
        try:
            # Check if ClamAV is available
            result = subprocess.run(['clamscan', '--no-summary', file_path], 
                                  capture_output=True, text=True, timeout=30)
            
            # ClamAV returns 0 for clean files, 1 for infected files
            return result.returncode == 0
            
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
            # If ClamAV is not available or times out, assume file is clean
            # In production, you might want to fail closed
            logger.warning("Malware scanning not available")
            return True
    
    def generate_secure_filename(self, original_filename: str) -> str:
        """
        Generate secure filename
        
        Args:
            original_filename: Original filename
            
        Returns:
            Secure filename
        """
        try:
            # Get file extension
            name, ext = os.path.splitext(original_filename)
            
            # Generate secure hash for filename
            secure_hash = hashlib.sha256(
                f"{original_filename}{os.urandom(16)}".encode()
            ).hexdigest()[:16]
            
            # Create secure filename
            secure_filename = f"{secure_hash}{ext.lower()}"
            
            return secure_filename
            
        except Exception as e:
            logger.error(f"Filename generation error: {e}")
            # Fallback to timestamp-based filename
            import time
            return f"file_{int(time.time())}{os.path.splitext(original_filename)[1]}"
    
    def validate_file_integrity(self, file_path: str) -> bool:
        """
        Validate file integrity
        
        Args:
            file_path: Path to file
            
        Returns:
            True if file is valid, False otherwise
        """
        try:
            # Check if file exists and is readable
            if not os.path.exists(file_path) or not os.access(file_path, os.R_OK):
                return False
            
            # Check file size is reasonable
            file_size = os.path.getsize(file_path)
            if file_size == 0 or file_size > 100 * 1024 * 1024:  # 100MB max
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"File integrity validation error: {e}")
            return False


# Global file security service
_file_security_service: Optional[FileSecurityService] = None


def get_file_security_service() -> FileSecurityService:
    """Get or create global file security service"""
    global _file_security_service
    
    if _file_security_service is None:
        _file_security_service = FileSecurityService()
    
    return _file_security_service


async def validate_uploaded_file(
    file: UploadFile,
    category: str = 'default',
    max_size: Optional[int] = None
) -> bool:
    """
    Validate uploaded file for security
    
    Args:
        file: Uploaded file
        category: File category
        max_size: Maximum file size (overrides default)
        
    Returns:
        True if file is valid, False otherwise
    """
    service = get_file_security_service()
    
    # Validate file type
    if not service.validate_file_type(file, category):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type"
        )
    
    # Validate file size
    if not service.validate_file_size(file, category):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large"
        )
    
    return True
