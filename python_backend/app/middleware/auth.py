"""Authentication middleware"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import structlog

from app.core.security import decode_token
from app.core.redis_client import cache_service

logger = structlog.get_logger()

security = HTTPBearer()


class AuthMiddleware:
    """Authentication middleware for protecting routes"""
    
    @staticmethod
    async def get_current_user(credentials: HTTPAuthorizationCredentials):
        """Get current user from JWT token"""
        token = credentials.credentials
        
        # Try to get from cache first
        cached_user = await cache_service.get(f"auth:token:{token}")
        if cached_user:
            return cached_user
        
        # Decode token
        payload = decode_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract user data
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_data = {
            "user_id": user_id,
            "employee_id": payload.get("employee_id"),
            "organization_id": payload.get("organization_id"),
            "role": payload.get("role"),
            "email": payload.get("email"),
        }
        
        # Cache user data
        await cache_service.set(f"auth:token:{token}", user_data, ttl=300)
        
        return user_data
    
    @staticmethod
    def require_role(required_role: str):
        """Decorator to require specific role"""
        async def role_checker(user_data: dict):
            if user_data.get("role") != required_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return user_data
        return role_checker
    
    @staticmethod
    def require_any_role(*required_roles: str):
        """Decorator to require any of the specified roles"""
        async def role_checker(user_data: dict):
            if user_data.get("role") not in required_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return user_data
        return role_checker
