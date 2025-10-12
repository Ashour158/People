"""
Security middleware for FastAPI application
"""
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
import structlog

logger = structlog.get_logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy - SECURE VERSION (No unsafe-inline/unsafe-eval)
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'nonce-{random}'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' ws: wss: http://143.110.227.18:8000 https://143.110.227.18:8000; "
            "media-src 'self' blob:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'; "
            "upgrade-insecure-requests; "
            "block-all-mixed-content"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = {}
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        current_time = __import__('time').time()
        
        # Clean old entries
        self.clients = {
            ip: times for ip, times in self.clients.items()
            if any(t > current_time - self.period for t in times)
        }
        
        # Check rate limit
        if client_ip in self.clients:
            self.clients[client_ip] = [
                t for t in self.clients[client_ip] 
                if t > current_time - self.period
            ]
            
            if len(self.clients[client_ip]) >= self.calls:
                logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                return Response(
                    content="Rate limit exceeded",
                    status_code=429,
                    headers={"Retry-After": str(self.period)}
                )
        
        # Add current request
        if client_ip not in self.clients:
            self.clients[client_ip] = []
        self.clients[client_ip].append(current_time)
        
        return await call_next(request)


class EnhancedInputValidationMiddleware(BaseHTTPMiddleware):
    """Enhanced input validation and sanitization middleware"""
    
    async def dispatch(self, request: Request, call_next):
        # Check for suspicious patterns in request
        if request.method in ["POST", "PUT", "PATCH"]:
            # Get request body for validation
            body = await request.body()
            if body:
                body_str = body.decode('utf-8', errors='ignore')
                
                # Enhanced XSS detection patterns
                xss_patterns = [
                    r'<script[^>]*>.*?</script>',
                    r'javascript:',
                    r'on\w+\s*=',
                    r'<iframe[^>]*>',
                    r'<object[^>]*>',
                    r'<embed[^>]*>',
                    r'<form[^>]*>',
                    r'<input[^>]*>',
                    r'<link[^>]*>',
                    r'<meta[^>]*>',
                    r'<style[^>]*>',
                    r'expression\s*\(',
                    r'url\s*\(',
                    r'@import',
                    r'<link[^>]*stylesheet',
                    r'<script[^>]*src',
                    r'<img[^>]*onerror',
                    r'<svg[^>]*onload',
                    r'<body[^>]*onload',
                    r'<div[^>]*onclick',
                    r'<a[^>]*onclick',
                    r'<button[^>]*onclick'
                ]
                
                # SQL injection patterns
                sql_patterns = [
                    r'union\s+select',
                    r'drop\s+table',
                    r'delete\s+from',
                    r'insert\s+into',
                    r'update\s+set',
                    r'exec\s*\(',
                    r'execute\s*\(',
                    r'sp_',
                    r'xp_',
                    r'--',
                    r'/\*.*?\*/',
                    r'waitfor\s+delay',
                    r'benchmark\s*\(',
                    r'sleep\s*\(',
                    r'load_file\s*\(',
                    r'into\s+outfile',
                    r'into\s+dumpfile'
                ]
                
                # Check for XSS patterns
                import re
                for pattern in xss_patterns:
                    if re.search(pattern, body_str, re.IGNORECASE | re.DOTALL):
                        logger.warning(f"XSS attempt detected: {pattern}")
                        return Response(
                            content="Invalid input detected - XSS attempt blocked",
                            status_code=400
                        )
                
                # Check for SQL injection patterns
                for pattern in sql_patterns:
                    if re.search(pattern, body_str, re.IGNORECASE):
                        logger.warning(f"SQL injection attempt detected: {pattern}")
                        return Response(
                            content="Invalid input detected - SQL injection attempt blocked",
                            status_code=400
                        )
                
                # Check for path traversal
                path_traversal_patterns = [
                    r'\.\./',
                    r'\.\.\\',
                    r'%2e%2e%2f',
                    r'%2e%2e%5c',
                    r'\.\.%2f',
                    r'\.\.%5c'
                ]
                
                for pattern in path_traversal_patterns:
                    if re.search(pattern, body_str, re.IGNORECASE):
                        logger.warning(f"Path traversal attempt detected: {pattern}")
                        return Response(
                            content="Invalid input detected - Path traversal attempt blocked",
                            status_code=400
                        )
        
        return await call_next(request)
