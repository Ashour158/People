"""Rate limiting middleware"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import structlog

from app.core.config import settings
from app.core.redis_client import redis_client

logger = structlog.get_logger()


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app):
        super().__init__(app)
        self.requests = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/"]:
            return await call_next(request)
        
        # Get client identifier (IP address)
        client_ip = request.client.host
        key = f"rate_limit:{client_ip}"
        
        # Check rate limit using Redis if available
        if redis_client:
            try:
                current = await redis_client.incr(key)
                if current == 1:
                    await redis_client.expire(key, 60)  # 1 minute window
                
                if current > settings.RATE_LIMIT_PER_MINUTE:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again later."
                    )
            except Exception as e:
                logger.error(f"Rate limit error: {e}")
        else:
            # Fallback to in-memory rate limiting
            now = datetime.now()
            cutoff = now - timedelta(minutes=1)
            
            # Clean old requests
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if req_time > cutoff
            ]
            
            # Check rate limit
            if len(self.requests[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later."
                )
            
            # Add current request
            self.requests[client_ip].append(now)
        
        response = await call_next(request)
        return response
