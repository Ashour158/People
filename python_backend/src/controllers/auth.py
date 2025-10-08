"""
Authentication Controller (API Routes).
"""
from fastapi import APIRouter, Depends

from ..services.auth import auth_service
from ..validators.auth import LoginSchema, ChangePasswordSchema
from ..middleware.auth import get_current_user
from ..utils.response import success_response

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/login")
async def login(data: LoginSchema):
    """User login."""
    result = auth_service.login(data.username, data.password)
    return success_response(result, message="Login successful")


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information."""
    return success_response(current_user)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordSchema,
    current_user: dict = Depends(get_current_user)
):
    """Change user password."""
    result = auth_service.change_password(
        current_user['user_id'],
        data.current_password,
        data.new_password
    )
    return success_response(result)


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """User logout (client-side token removal)."""
    return success_response({'message': 'Logged out successfully'})
