"""
Response utilities for standardized API responses.
"""
from typing import Any, Optional
from fastapi.responses import JSONResponse


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    status_code: int = 200,
    meta: Optional[dict] = None
) -> JSONResponse:
    """
    Return a standardized success response.
    
    Args:
        data: Response data
        message: Optional success message
        status_code: HTTP status code
        meta: Optional metadata (pagination, etc.)
        
    Returns:
        JSONResponse with standardized format
    """
    response_data = {
        'success': True,
        'data': data
    }
    
    if message:
        response_data['message'] = message
        
    if meta:
        response_data['meta'] = meta
        
    return JSONResponse(content=response_data, status_code=status_code)


def error_response(
    error: str,
    status_code: int = 400,
    code: Optional[str] = None,
    details: Optional[dict] = None
) -> JSONResponse:
    """
    Return a standardized error response.
    
    Args:
        error: Error message
        status_code: HTTP status code
        code: Optional error code
        details: Optional error details
        
    Returns:
        JSONResponse with standardized error format
    """
    response_data = {
        'success': False,
        'error': error
    }
    
    if code:
        response_data['code'] = code
        
    if details:
        response_data['details'] = details
        
    return JSONResponse(content=response_data, status_code=status_code)
