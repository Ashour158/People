"""
Authentication Service.
"""
from typing import Dict, Optional
from datetime import datetime

from ..config.database import query, transaction
from ..middleware.auth import hash_password, verify_password, create_access_token
from ..middleware.exceptions import AppError, UnauthorizedError


class AuthService:
    """Service for authentication operations."""
    
    def login(self, username: str, password: str) -> Dict:
        """
        Authenticate user and generate token.
        
        Args:
            username: Username or email
            password: Password
            
        Returns:
            Dictionary with access token and user info
        """
        # Find user by username or email
        results = query(
            """
            SELECT 
                u.user_id, u.username, u.email, u.password_hash,
                u.organization_id, u.employee_id, u.is_active, u.is_locked
            FROM users u
            WHERE (u.username = %s OR u.email = %s) 
                AND u.is_deleted = FALSE
            """,
            (username, username)
        )
        
        if not results:
            raise UnauthorizedError("Invalid credentials")
        
        user = results[0]
        
        if not user['is_active']:
            raise UnauthorizedError("Account is inactive")
        
        if user['is_locked']:
            raise UnauthorizedError("Account is locked")
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            # TODO: Track failed login attempts
            raise UnauthorizedError("Invalid credentials")
        
        # Get user roles and permissions
        user_details = query(
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
            WHERE u.user_id = %s
            GROUP BY u.user_id
            """,
            (user['user_id'],)
        )[0]
        
        # Update last login
        query(
            "UPDATE users SET last_login_at = NOW() WHERE user_id = %s",
            (user['user_id'],)
        )
        
        # Generate access token
        token_data = {
            'user_id': user['user_id'],
            'username': user['username'],
            'organization_id': user['organization_id']
        }
        access_token = create_access_token(token_data)
        
        # Remove sensitive data
        user_details.pop('password_hash', None)
        
        return {
            'access_token': access_token,
            'token_type': 'bearer',
            'user': user_details
        }
    
    def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str
    ) -> Dict[str, str]:
        """
        Change user password.
        
        Args:
            user_id: User UUID
            current_password: Current password
            new_password: New password
            
        Returns:
            Success message
        """
        # Get user
        results = query(
            "SELECT password_hash FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        if not results:
            raise UnauthorizedError("User not found")
        
        user = results[0]
        
        # Verify current password
        if not verify_password(current_password, user['password_hash']):
            raise UnauthorizedError("Current password is incorrect")
        
        # Hash new password
        new_password_hash = hash_password(new_password)
        
        # Update password
        query(
            "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE user_id = %s",
            (new_password_hash, user_id)
        )
        
        return {'message': 'Password changed successfully'}


# Create singleton instance
auth_service = AuthService()
