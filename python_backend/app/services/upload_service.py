"""File upload utility"""
import os
import uuid
from typing import Optional, List
from fastapi import UploadFile, HTTPException, status
import aiofiles
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class FileUploadService:
    """Service for handling file uploads"""
    
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.max_size = settings.MAX_UPLOAD_SIZE
        self.allowed_extensions = settings.ALLOWED_EXTENSIONS
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def _is_allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        ext = os.path.splitext(filename)[1].lower()
        return ext in self.allowed_extensions
    
    async def upload_file(
        self,
        file: UploadFile,
        subfolder: Optional[str] = None
    ) -> str:
        """Upload file and return file path"""
        
        # Check file size
        file_size = 0
        chunk_size = 1024 * 1024  # 1MB
        
        # Check extension
        if not self._is_allowed_file(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed: {', '.join(self.allowed_extensions)}"
            )
        
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        # Create subfolder if specified
        if subfolder:
            upload_path = os.path.join(self.upload_dir, subfolder)
            os.makedirs(upload_path, exist_ok=True)
        else:
            upload_path = self.upload_dir
        
        file_path = os.path.join(upload_path, unique_filename)
        
        try:
            # Write file
            async with aiofiles.open(file_path, 'wb') as f:
                while chunk := await file.read(chunk_size):
                    file_size += len(chunk)
                    
                    # Check size limit
                    if file_size > self.max_size:
                        # Delete partial file
                        os.remove(file_path)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File too large. Maximum size: {self.max_size / 1024 / 1024}MB"
                        )
                    
                    await f.write(chunk)
            
            logger.info(f"File uploaded: {file_path}")
            
            # Return relative path
            if subfolder:
                return f"{subfolder}/{unique_filename}"
            return unique_filename
            
        except Exception as e:
            logger.error(f"File upload error: {e}")
            # Clean up on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete uploaded file"""
        full_path = os.path.join(self.upload_dir, file_path)
        
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
                logger.info(f"File deleted: {full_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"File deletion error: {e}")
            return False
    
    def get_file_url(self, file_path: str) -> str:
        """Get public URL for file"""
        # In production, this would be a CDN URL
        return f"/uploads/{file_path}"


# Global file upload service
file_upload_service = FileUploadService()
