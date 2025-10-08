"""Utility functions for pagination"""
from typing import Dict, Any
from math import ceil


def get_pagination_params(page: int = 1, limit: int = 10) -> Dict[str, int]:
    """Get pagination parameters"""
    page = max(1, page)
    limit = min(max(1, limit), 100)
    offset = (page - 1) * limit
    
    return {
        "page": page,
        "limit": limit,
        "offset": offset
    }


def get_pagination_meta(
    page: int,
    limit: int,
    total: int
) -> Dict[str, Any]:
    """Get pagination metadata"""
    pages = ceil(total / limit) if limit > 0 else 0
    
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "pages": pages,
        "has_next": page < pages,
        "has_prev": page > 1
    }


def paginate_query(query, page: int = 1, limit: int = 10):
    """Apply pagination to SQLAlchemy query"""
    params = get_pagination_params(page, limit)
    return query.offset(params["offset"]).limit(params["limit"])
