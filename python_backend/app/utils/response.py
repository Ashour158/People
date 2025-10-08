"""Utility functions for response formatting"""
from typing import Any, Dict, Optional, List
from fastapi.responses import JSONResponse


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    status_code: int = 200
) -> JSONResponse:
    """Create success response"""
    response = {
        "success": True
    }
    
    if message:
        response["message"] = message
    
    if data is not None:
        response["data"] = data
    
    return JSONResponse(content=response, status_code=status_code)


def error_response(
    message: str,
    status_code: int = 400,
    details: Optional[Dict] = None
) -> JSONResponse:
    """Create error response"""
    response = {
        "success": False,
        "error": message
    }
    
    if details:
        response["details"] = details
    
    return JSONResponse(content=response, status_code=status_code)


def paginated_response(
    data: List[Any],
    page: int,
    limit: int,
    total: int,
    message: Optional[str] = None
) -> JSONResponse:
    """Create paginated response"""
    from math import ceil
    
    response = {
        "success": True,
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": ceil(total / limit) if limit > 0 else 0
        }
    }
    
    if message:
        response["message"] = message
    
    return JSONResponse(content=response)
