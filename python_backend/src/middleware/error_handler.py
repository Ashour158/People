"""
Error handling middleware.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from .exceptions import AppError
import logging

logger = logging.getLogger(__name__)


async def error_handler(request: Request, exc: AppError) -> JSONResponse:
    """
    Handle application errors.
    
    Args:
        request: FastAPI request
        exc: Application error
        
    Returns:
        JSONResponse with error details
    """
    logger.error(f"Application error: {exc.message}", exc_info=True)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.message,
            "code": exc.code
        }
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle generic exceptions.
    
    Args:
        request: FastAPI request
        exc: Generic exception
        
    Returns:
        JSONResponse with error details
    """
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error"
        }
    )
