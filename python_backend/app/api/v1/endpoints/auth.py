"""Authentication API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.db.database import get_db
from app.schemas.schemas import (
    LoginRequest, LoginResponse, RegisterRequest,
    PasswordResetRequest, PasswordResetConfirm, BaseResponse
)
from app.models.models import User, Employee, Organization, Company
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token
)
from app.events.event_dispatcher import EventDispatcher, Events
from app.core.redis_client import cache_service
from datetime import datetime
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = structlog.get_logger()


@router.post("/register", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new user and organization"""
    
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create organization
        org = Organization(
            organization_id=uuid.uuid4(),
            organization_name=data.organization_name,
            organization_code=data.organization_name.lower().replace(" ", "_"),
            is_active=True
        )
        db.add(org)
        
        # Create default company
        company = Company(
            company_id=uuid.uuid4(),
            organization_id=org.organization_id,
            company_name=data.organization_name,
            company_code="MAIN",
            is_active=True
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
            is_verified=True
        )
        db.add(user)
        
        # Create employee profile
        employee = Employee(
            employee_id=uuid.uuid4(),
            user_id=user.user_id,
            organization_id=org.organization_id,
            company_id=company.company_id,
            employee_code=f"EMP001",
            first_name=data.first_name,
            last_name=data.last_name,
            employment_type="full_time",
            employment_status="active",
            hire_date=datetime.now().date()
        )
        db.add(employee)
        
        await db.commit()
        
        # Dispatch event
        await EventDispatcher.dispatch(Events.USER_REGISTERED, {
            "user_id": str(user.user_id),
            "email": user.email
        })
        
        logger.info(f"User registered: {user.email}")
        
        return BaseResponse(
            success=True,
            message="Registration successful"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """User login"""
    
    # Find user
    result = await db.execute(
        select(User, Employee).join(Employee).where(User.email == data.email)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user, employee = row
    
    # Check if account is locked
    if user.account_locked_until and user.account_locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked. Please try again later."
        )
    
    # Verify password
    if not verify_password(data.password, user.password_hash):
        # Increment failed attempts
        user.failed_login_attempts += 1
        
        # Lock account after 5 failed attempts
        if user.failed_login_attempts >= 5:
            from datetime import timedelta
            user.account_locked_until = datetime.utcnow() + timedelta(minutes=30)
        
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
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
        "role": user.role
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Dispatch event
    await EventDispatcher.dispatch(Events.USER_LOGIN, {
        "user_id": str(user.user_id),
        "email": user.email
    })
    
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
            "last_name": employee.last_name
        }
    )


@router.post("/logout")
async def logout():
    """User logout"""
    # In a real implementation, you would invalidate the token
    # For now, client-side token removal is sufficient
    
    await EventDispatcher.dispatch(Events.USER_LOGOUT, {})
    
    return BaseResponse(
        success=True,
        message="Logged out successfully"
    )


@router.post("/refresh-token")
async def refresh_token(refresh_token: str):
    """Refresh access token"""
    from app.core.security import decode_token
    
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new access token
    token_data = {
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "employee_id": payload.get("employee_id"),
        "organization_id": payload.get("organization_id"),
        "role": payload.get("role")
    }
    
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/password-reset/request", response_model=BaseResponse)
async def request_password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset"""
    
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Return success even if user not found (security best practice)
        return BaseResponse(
            success=True,
            message="If the email exists, a reset link will be sent"
        )
    
    # Generate reset token
    import secrets
    reset_token = secrets.token_urlsafe(32)
    from datetime import timedelta
    
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
    
    await db.commit()
    
    # Send email with reset link
    await send_password_reset_email(user.email, reset_token)
    
    await EventDispatcher.dispatch(Events.PASSWORD_RESET, {
        "user_id": str(user.user_id),
        "email": user.email,
        "reset_token": reset_token
    })
    
    logger.info(f"Password reset requested for: {user.email}")
    
    return BaseResponse(
        success=True,
        message="If the email exists, a reset link will be sent"
    )


async def send_password_reset_email(email: str, reset_token: str):
    """Send password reset email to user"""
    # Implementation for sending password reset email
    # This would integrate with your email service (SendGrid, AWS SES, etc.)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    # For now, just log the reset link (in production, send actual email)
    print(f"Password reset link for {email}: {reset_link}")
    
    # TODO: Implement actual email sending
    # await email_service.send_password_reset_email(email, reset_link)


@router.post("/password-reset/confirm", response_model=BaseResponse)
async def confirm_password_reset(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Confirm password reset"""
    
    result = await db.execute(
        select(User).where(User.password_reset_token == data.token)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    if user.password_reset_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Update password
    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    
    await db.commit()
    
    logger.info(f"Password reset completed for: {user.email}")
    
    return BaseResponse(
        success=True,
        message="Password reset successful"
    )
