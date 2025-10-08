"""
Authentication middleware and utilities.
"""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from ..config.settings import settings
from ..config.database import query
from .exceptions import UnauthorizedError

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token scheme
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional expiration time delta
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token data
        
    Raises:
        UnauthorizedError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise UnauthorizedError("Invalid or expired token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get the current authenticated user from the JWT token.
    
    Args:
        credentials: HTTP bearer credentials
        
    Returns:
        User data dictionary
        
    Raises:
        UnauthorizedError: If authentication fails
    """
    token = credentials.credentials
    payload = decode_token(token)
    
    user_id = payload.get("user_id")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")
    
    # Get user details with roles and permissions
    results = query(
        """
        SELECT 
            u.user_id, u.username, u.email, u.organization_id, u.employee_id,
            COALESCE(
                json_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL),
                '[]'
            ) as roles,
            COALESCE(
                json_agg(DISTINCT p.permission_code) FILTER (WHERE p.permission_code IS NOT NULL),
                '[]'
            ) as permissions
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
        LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE u.user_id = %s AND u.is_active = TRUE AND u.is_deleted = FALSE
        GROUP BY u.user_id
        """,
        (user_id,)
    )
    
    if not results:
        raise UnauthorizedError("User not found or inactive")
    
    return results[0]


def require_permission(permission: str):
    """
    Decorator to require a specific permission.
    
    Args:
        permission: Required permission code
        
    Returns:
        Dependency function that checks permission
    """
    async def permission_checker(user: dict = Depends(get_current_user)):
        if permission not in user.get('permissions', []):
            raise UnauthorizedError(f"Missing required permission: {permission}")
        return user
    
    return permission_checker
