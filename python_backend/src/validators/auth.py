"""
Pydantic validators/schemas for Authentication module.
"""
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class LoginSchema(BaseModel):
    """Schema for user login."""
    username: str = Field(..., min_length=3, max_length=50, description="Username or email")
    password: str = Field(..., min_length=8, description="Password")


class RegisterSchema(BaseModel):
    """Schema for user registration."""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password")
    first_name: str = Field(..., max_length=100, description="First name")
    last_name: str = Field(..., max_length=100, description="Last name")
    organization_name: Optional[str] = Field(None, max_length=200, description="Organization name")


class ChangePasswordSchema(BaseModel):
    """Schema for changing password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


class TokenResponse(BaseModel):
    """Response model for authentication token."""
    access_token: str
    token_type: str = "bearer"
    user: dict
    
    class Config:
        from_attributes = True
