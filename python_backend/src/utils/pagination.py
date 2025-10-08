"""
Pagination utilities.
"""
from typing import Dict, Any


def get_pagination(filters: dict) -> dict:
    """
    Extract pagination parameters from filters.
    
    Args:
        filters: Dictionary with page, limit/per_page parameters
        
    Returns:
        Dictionary with page, per_page, and offset
    """
    page = int(filters.get('page', 1))
    per_page = int(filters.get('limit', filters.get('per_page', 10)))
    
    # Ensure valid values
    page = max(1, page)
    per_page = max(1, min(100, per_page))
    
    offset = (page - 1) * per_page
    
    return {
        'page': page,
        'per_page': per_page,
        'offset': offset
    }


def get_pagination_meta(total: int, page: int, per_page: int) -> Dict[str, Any]:
    """
    Generate pagination metadata.
    
    Args:
        total: Total number of records
        page: Current page number
        per_page: Records per page
        
    Returns:
        Dictionary with pagination metadata
    """
    total_pages = (total + per_page - 1) // per_page
    
    return {
        'page': page,
        'per_page': per_page,
        'total': total,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1
    }
