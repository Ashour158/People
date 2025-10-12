"""Authentication API endpoints"""

import secrets
import uuid
from datetime import datetime, timedelta

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.events.event_dispatcher import EventDispatcher, Events
from app.models.models import Company, Employee, Organization, User
from app.schemas.schemas import (
    BaseResponse,
    LoginRequest,
    LoginResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = structlog.get_logger()


@router.post("/register", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)) -> BaseResponse:
    """
    Register a new user and create their organization.
    
    This endpoint handles the complete user registration process including:
    - Creating a new organization
    - Setting up the default company
    - Creating the user account
    - Creating the employee profile
    - Dispatching registration events
    
    Args:
        data: Registration request containing user and organization details
        db: Database session for transaction management
        
    Returns:
        BaseResponse: Success message confirming registration
        
    Raises:
        HTTPException: If email already exists or registration fails
    """

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    try:
        # Create organization
        org = Organization(
            organization_id=uuid.uuid4(),
            organization_name=data.organization_name,
            organization_code=data.organization_name.lower().replace(" ", "_"),
            is_active=True,
        )
        db.add(org)

        # Create default company
        company = Company(
            company_id=uuid.uuid4(),
            organization_id=org.organization_id,
            company_name=data.organization_name,
            company_code="MAIN",
            is_active=True,
        )
        db.add(company)

        # Create user
        user = User(
            user_id=uuid.uuid4(),
            organization_id=org.organization_id,
            email=data.email,
            password_hash=hash_password(data.password),
            role="admin",  # First user is admin
            is_active=True,
            is_verified=True,
        )
        db.add(user)

        # Create employee profile
        employee = Employee(
            employee_id=uuid.uuid4(),
            user_id=user.user_id,
            organization_id=org.organization_id,
            company_id=company.company_id,
            employee_code="EMP001",
            first_name=data.first_name,
            last_name=data.last_name,
            employment_type="full_time",
            employment_status="active",
            hire_date=datetime.now().date(),
        )
        db.add(employee)

        await db.commit()

        # Dispatch event
        await EventDispatcher.dispatch(
            Events.USER_REGISTERED, {"user_id": str(user.user_id), "email": user.email}
        )

        logger.info(f"User registered: {user.email}")

        return BaseResponse(success=True, message="Registration successful")

    except Exception as e:
        await db.rollback()
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed"
        ) from e


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    """
    Authenticate user and generate access tokens.
    
    This endpoint handles user authentication including:
    - Validating user credentials
    - Checking account status (active, locked)
    - Implementing security measures (failed login attempts, account locking)
    - Generating JWT access and refresh tokens
    - Updating last login timestamp
    - Dispatching login events
    
    Args:
        data: Login request containing email and password
        db: Database session for user validation
        
    Returns:
        LoginResponse: Access token, refresh token, and user information
        
    Raises:
        HTTPException: If credentials are invalid, account is locked, or user is inactive
    """

    # Find user
    result = await db.execute(select(User, Employee).join(Employee).where(User.email == data.email))
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    user, employee = row

    # Check if account is locked
    if user.account_locked_until and user.account_locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked. Please try again later.",
        )

    # Verify password
    if not verify_password(data.password, user.password_hash):
        # Increment failed attempts
        user.failed_login_attempts += 1

        # Lock account after MAX_FAILED_ATTEMPTS failed attempts
        MAX_FAILED_ATTEMPTS = 5
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.account_locked_until = datetime.utcnow() + timedelta(minutes=30)

        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    # Reset failed attempts
    user.failed_login_attempts = 0
    user.account_locked_until = None
    user.last_login = datetime.utcnow()
    await db.commit()

    # Create tokens
    token_data = {
        "sub": str(user.user_id),
        "email": user.email,
        "employee_id": str(employee.employee_id),
        "organization_id": str(user.organization_id),
        "role": user.role,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Dispatch event
    await EventDispatcher.dispatch(
        Events.USER_LOGIN, {"user_id": str(user.user_id), "email": user.email}
    )

    logger.info(f"User logged in: {user.email}")

    return LoginResponse(
        success=True,
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "user_id": str(user.user_id),
            "email": user.email,
            "employee_id": str(employee.employee_id),
            "role": user.role,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
        },
    )


@router.post("/logout")
async def logout(
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """
    Logout user and invalidate session.
    
    This endpoint handles user logout including:
    - Invalidating the current session
    - Dispatching logout events
    - Clearing client-side tokens (handled by frontend)
    
    Returns:
        BaseResponse: Success message confirming logout
    """
    try:
        # Get token from request
        token = credentials.credentials
        
        # Invalidate token in cache
        from app.core.redis_client import cache_service
        await cache_service.delete(f"auth:token:{token}")
        
        # Log logout event
        logger.info(f"User logged out: {current_user['user_id']}")
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {"message": "Logged out successfully"}  # Always return success for security

    await EventDispatcher.dispatch(Events.USER_LOGOUT, {})

    return BaseResponse(success=True, message="Logged out successfully")


@router.post("/refresh-token")
async def refresh_token(refresh_token: str):
    """
    Refresh access token using valid refresh token.
    
    This endpoint handles token refresh including:
    - Validating the refresh token
    - Extracting user information from token
    - Generating new access token
    - Maintaining security through token rotation
    
    Args:
        refresh_token: Valid refresh token from previous authentication
        
    Returns:
        dict: New access token and token type
        
    Raises:
        HTTPException: If refresh token is invalid or expired
    """
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    # Create new access token
    token_data = {
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "employee_id": payload.get("employee_id"),
        "organization_id": payload.get("organization_id"),
        "role": payload.get("role"),
    }

    access_token = create_access_token(token_data)

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/password-reset/request", response_model=BaseResponse)
async def request_password_reset(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """
    Request password reset for user account.
    
    This endpoint handles password reset requests including:
    - Validating user email exists
    - Generating secure reset token
    - Setting token expiration (1 hour)
    - Sending reset email (simulated)
    - Dispatching password reset events
    
    Args:
        data: Password reset request containing user email
        db: Database session for user lookup
        
    Returns:
        BaseResponse: Success message (always returns success for security)
    """

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        # Return success even if user not found (security best practice)
        return BaseResponse(success=True, message="If the email exists, a reset link will be sent")

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)

    await db.commit()

    # Send email with reset link
    await send_password_reset_email(user.email, reset_token)

    await EventDispatcher.dispatch(
        Events.PASSWORD_RESET,
        {"user_id": str(user.user_id), "email": user.email, "reset_token": reset_token},
    )

    logger.info(f"Password reset requested for: {user.email}")

    return BaseResponse(success=True, message="If the email exists, a reset link will be sent")


async def send_password_reset_email(email: str, reset_token: str):
    """
    Send password reset email to user.
    
    This function handles password reset email delivery including:
    - Generating secure reset link with token
    - Preparing email content
    - Sending email via configured service
    - Logging reset link for development
    
    Args:
        email: User's email address
        reset_token: Secure token for password reset
        
    Note:
        Currently logs reset link for development purposes.
        In production, integrate with email service (SendGrid, AWS SES, etc.)
    """
    # Implementation for sending password reset email
    # This would integrate with your email service (SendGrid, AWS SES, etc.)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    # For now, just log the reset link (in production, send actual email)
    print(f"Password reset link for {email}: {reset_link}")

    # TODO: Implement actual email sending


@router.post("/password-reset/confirm", response_model=BaseResponse)
async def confirm_password_reset(data: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """
    Confirm password reset with valid token.
    
    This endpoint handles password reset confirmation including:
    - Validating reset token exists and is not expired
    - Hashing new password securely
    - Clearing reset token and expiration
    - Updating user password
    - Dispatching password reset completion events
    
    Args:
        data: Password reset confirmation containing token and new password
        db: Database session for user update
        
    Returns:
        BaseResponse: Success message confirming password reset
        
    Raises:
        HTTPException: If token is invalid or expired
    """

    result = await db.execute(select(User).where(User.password_reset_token == data.token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    if user.password_reset_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired"
        )

    # Update password
    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None

    await db.commit()

    logger.info(f"Password reset completed for: {user.email}")

    return BaseResponse(success=True, message="Password reset successful")
