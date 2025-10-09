"""
OAuth 2.0 Authentication Implementation
Supports multiple OAuth providers (Google, Microsoft, GitHub, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, timedelta
import httpx
import structlog
import uuid

from app.db.database import get_db
from app.schemas.schemas import BaseResponse
from app.models.models import User, Employee, Organization
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.events.event_dispatcher import EventDispatcher
from pydantic import BaseModel, Field, validator
from app.core.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/oauth", tags=["OAuth 2.0"])


# ============= OAuth Configuration =============

class OAuthProvider:
    """OAuth provider configuration"""
    
    GOOGLE = {
        "name": "google",
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": ["openid", "email", "profile"]
    }
    
    MICROSOFT = {
        "name": "microsoft",
        "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        "scopes": ["openid", "email", "profile", "User.Read"]
    }
    
    GITHUB = {
        "name": "github",
        "auth_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scopes": ["read:user", "user:email"]
    }
    
    @classmethod
    def get_provider(cls, provider_name: str) -> dict:
        """Get provider configuration"""
        providers = {
            "google": cls.GOOGLE,
            "microsoft": cls.MICROSOFT,
            "github": cls.GITHUB
        }
        return providers.get(provider_name.lower())


# ============= Pydantic Models =============

class OAuthAuthorizationRequest(BaseModel):
    """OAuth authorization request"""
    provider: str = Field(..., description="google, microsoft, github")
    redirect_uri: str = Field(..., description="Redirect URI after authorization")
    state: Optional[str] = Field(None, description="State parameter for CSRF protection")
    
    @validator('provider')
    def validate_provider(cls, v):
        allowed = ['google', 'microsoft', 'github']
        if v.lower() not in allowed:
            raise ValueError(f'provider must be one of {allowed}')
        return v.lower()


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request"""
    provider: str
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: Optional[str] = None
    redirect_uri: str


class OAuthTokenResponse(BaseModel):
    """OAuth token response"""
    access_token: str
    refresh_token: Optional[str]
    token_type: str = "bearer"
    expires_in: int
    user: dict


class OAuthLinkAccountRequest(BaseModel):
    """Link OAuth account to existing user"""
    provider: str
    provider_user_id: str
    provider_email: str
    access_token: str


# ============= OAuth Service =============

class OAuthService:
    """OAuth 2.0 authentication service"""
    
    @staticmethod
    def get_authorization_url(
        provider_name: str,
        client_id: str,
        redirect_uri: str,
        state: str
    ) -> str:
        """Generate OAuth authorization URL"""
        provider = OAuthProvider.get_provider(provider_name)
        
        if not provider:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported OAuth provider: {provider_name}"
            )
        
        scopes = " ".join(provider["scopes"])
        
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": scopes,
            "state": state
        }
        
        # Build query string
        query = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{provider['auth_url']}?{query}"
    
    @staticmethod
    async def exchange_code_for_token(
        provider_name: str,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str
    ) -> dict:
        """Exchange authorization code for access token"""
        provider = OAuthProvider.get_provider(provider_name)
        
        if not provider:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported OAuth provider: {provider_name}"
            )
        
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                provider["token_url"],
                data=data,
                headers={"Accept": "application/json"}
            )
            
            if response.status_code != 200:
                logger.error(f"OAuth token exchange failed: {response.text}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to exchange authorization code"
                )
            
            return response.json()
    
    @staticmethod
    async def get_user_info(
        provider_name: str,
        access_token: str
    ) -> dict:
        """Get user information from OAuth provider"""
        provider = OAuthProvider.get_provider(provider_name)
        
        if not provider:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported OAuth provider: {provider_name}"
            )
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                provider["userinfo_url"],
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get user info: {response.text}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to retrieve user information"
                )
            
            user_data = response.json()
            
            # Normalize user data across providers
            if provider_name == "google":
                return {
                    "provider_user_id": user_data.get("id"),
                    "email": user_data.get("email"),
                    "name": user_data.get("name"),
                    "picture": user_data.get("picture"),
                    "email_verified": user_data.get("email_verified", False)
                }
            elif provider_name == "microsoft":
                return {
                    "provider_user_id": user_data.get("id"),
                    "email": user_data.get("mail") or user_data.get("userPrincipalName"),
                    "name": user_data.get("displayName"),
                    "picture": None,
                    "email_verified": True
                }
            elif provider_name == "github":
                # GitHub requires separate API call for email
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                emails = email_response.json()
                primary_email = next(
                    (e["email"] for e in emails if e["primary"]),
                    None
                )
                
                return {
                    "provider_user_id": str(user_data.get("id")),
                    "email": primary_email,
                    "name": user_data.get("name") or user_data.get("login"),
                    "picture": user_data.get("avatar_url"),
                    "email_verified": True
                }
            
            return user_data
    
    @staticmethod
    async def find_or_create_user(
        db: AsyncSession,
        provider_name: str,
        user_info: dict
    ) -> User:
        """Find existing user or create new one from OAuth data"""
        
        # Check if user exists by email
        result = await db.execute(
            select(User).where(User.email == user_info["email"])
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Update OAuth info
            logger.info(f"Existing user found: {user.email}")
            return user
        
        # Create new user and organization
        org = Organization(
            organization_id=uuid.uuid4(),
            organization_name=f"{user_info['name']}'s Organization",
            organization_code=user_info['email'].split('@')[0],
            is_active=True
        )
        db.add(org)
        
        # Create user
        user = User(
            user_id=uuid.uuid4(),
            organization_id=org.organization_id,
            email=user_info["email"],
            password_hash=hash_password(str(uuid.uuid4())),  # Random password
            role="admin",
            is_active=True,
            is_verified=user_info.get("email_verified", False)
        )
        db.add(user)
        
        # Create employee profile
        employee = Employee(
            employee_id=uuid.uuid4(),
            user_id=user.user_id,
            organization_id=org.organization_id,
            employee_code="EMP001",
            first_name=user_info["name"].split()[0] if user_info["name"] else "User",
            last_name=" ".join(user_info["name"].split()[1:]) if user_info["name"] and len(user_info["name"].split()) > 1 else "Name",
            employment_type="full_time",
            employment_status="active",
            hire_date=datetime.now().date()
        )
        db.add(employee)
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"New user created via OAuth: {user.email}")
        
        await EventDispatcher.dispatch("user.oauth_registered", {
            "user_id": str(user.user_id),
            "email": user.email,
            "provider": provider_name
        })
        
        return user


# ============= API Endpoints =============

@router.get("/authorize/{provider}")
async def oauth_authorize(
    provider: str,
    redirect_uri: str,
    state: Optional[str] = None
):
    """
    Get OAuth authorization URL
    
    This endpoint returns the authorization URL for the specified OAuth provider.
    Redirect the user to this URL to start the OAuth flow.
    """
    
    # In production, these should come from environment variables
    client_configs = {
        "google": {
            "client_id": settings.GOOGLE_CLIENT_ID if hasattr(settings, 'GOOGLE_CLIENT_ID') else "your-google-client-id",
        },
        "microsoft": {
            "client_id": settings.MICROSOFT_CLIENT_ID if hasattr(settings, 'MICROSOFT_CLIENT_ID') else "your-microsoft-client-id",
        },
        "github": {
            "client_id": settings.GITHUB_CLIENT_ID if hasattr(settings, 'GITHUB_CLIENT_ID') else "your-github-client-id",
        }
    }
    
    if provider not in client_configs:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider: {provider}"
        )
    
    config = client_configs[provider]
    state = state or str(uuid.uuid4())
    
    auth_url = OAuthService.get_authorization_url(
        provider,
        config["client_id"],
        redirect_uri,
        state
    )
    
    return BaseResponse(
        success=True,
        message="Authorization URL generated",
        data={
            "authorization_url": auth_url,
            "state": state,
            "provider": provider
        }
    )


@router.post("/callback/{provider}", response_model=BaseResponse)
async def oauth_callback(
    provider: str,
    data: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth callback handler
    
    This endpoint handles the OAuth callback after user authorization.
    Exchange the authorization code for an access token and create/login the user.
    """
    
    # Client configurations (should be in environment variables)
    client_configs = {
        "google": {
            "client_id": settings.GOOGLE_CLIENT_ID if hasattr(settings, 'GOOGLE_CLIENT_ID') else "your-google-client-id",
            "client_secret": settings.GOOGLE_CLIENT_SECRET if hasattr(settings, 'GOOGLE_CLIENT_SECRET') else "your-google-secret",
        },
        "microsoft": {
            "client_id": settings.MICROSOFT_CLIENT_ID if hasattr(settings, 'MICROSOFT_CLIENT_ID') else "your-microsoft-client-id",
            "client_secret": settings.MICROSOFT_CLIENT_SECRET if hasattr(settings, 'MICROSOFT_CLIENT_SECRET') else "your-microsoft-secret",
        },
        "github": {
            "client_id": settings.GITHUB_CLIENT_ID if hasattr(settings, 'GITHUB_CLIENT_ID') else "your-github-client-id",
            "client_secret": settings.GITHUB_CLIENT_SECRET if hasattr(settings, 'GITHUB_CLIENT_SECRET') else "your-github-secret",
        }
    }
    
    if provider not in client_configs:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider: {provider}"
        )
    
    config = client_configs[provider]
    
    try:
        # Exchange code for token
        token_data = await OAuthService.exchange_code_for_token(
            provider,
            data.code,
            config["client_id"],
            config["client_secret"],
            data.redirect_uri
        )
        
        # Get user info
        user_info = await OAuthService.get_user_info(
            provider,
            token_data["access_token"]
        )
        
        # Find or create user
        user = await OAuthService.find_or_create_user(db, provider, user_info)
        
        # Generate JWT tokens
        access_token = create_access_token(
            data={
                "sub": str(user.user_id),
                "email": user.email,
                "organization_id": str(user.organization_id),
                "role": user.role
            }
        )
        
        refresh_token = create_refresh_token(
            data={"sub": str(user.user_id)}
        )
        
        logger.info(f"OAuth login successful for {user.email} via {provider}")
        
        return BaseResponse(
            success=True,
            message="OAuth authentication successful",
            data={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": 86400,  # 24 hours
                "user": {
                    "user_id": str(user.user_id),
                    "email": user.email,
                    "organization_id": str(user.organization_id),
                    "role": user.role
                },
                "provider": provider
            }
        )
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"OAuth authentication failed: {str(e)}"
        )


@router.get("/providers")
async def list_oauth_providers():
    """List available OAuth providers"""
    
    providers = [
        {
            "name": "google",
            "display_name": "Google",
            "enabled": True,
            "icon": "google"
        },
        {
            "name": "microsoft",
            "display_name": "Microsoft",
            "enabled": True,
            "icon": "microsoft"
        },
        {
            "name": "github",
            "display_name": "GitHub",
            "enabled": True,
            "icon": "github"
        }
    ]
    
    return BaseResponse(
        success=True,
        message="OAuth providers retrieved",
        data={
            "providers": providers
        }
    )
