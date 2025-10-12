"""
Main FastAPI application entry point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog

from app.core.config import settings
from app.core.logger import setup_logging
from app.db.database import init_db, close_db
from app.core.redis_client import init_redis, close_redis
from app.middleware.error_handler import error_handler_middleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware, EnhancedInputValidationMiddleware
from app.middleware.csrf import CSRFProtectionMiddleware
from app.middleware.security_monitoring import SecurityMonitoringMiddleware
from app.middleware.performance_middleware import (
    PerformanceMonitoringMiddleware,
    DatabaseQueryMonitoringMiddleware,
    CachePerformanceMiddleware,
    SystemMetricsMiddleware,
    PerformanceAlertMiddleware
)
from app.api.v1.router import api_router
from app.events.event_dispatcher import EventDispatcher

# Setup logging
setup_logging()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("Starting HR Management System")
    
    # Initialize database
    await init_db()
    logger.info("Database connected successfully")
    
    # Initialize Redis
    try:
        await init_redis()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
    
    # Initialize event dispatcher
    EventDispatcher.initialize()
    logger.info("Event dispatcher initialized")
    
    logger.info("=" * 50)
    logger.info(f"Server is running on port {settings.PORT}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"API Version: {settings.API_VERSION}")
    logger.info("=" * 50)
    
    yield
    
    # Shutdown
    logger.info("Shutting down HR Management System")
    await close_db()
    await close_redis()
    logger.info("Graceful shutdown completed")


# Create FastAPI application
app = FastAPI(
    title="HR Management System API",
    description="Enterprise-grade multi-tenant HR Management System",
    version=settings.API_VERSION,
    docs_url=f"/api/{settings.API_VERSION}/docs",
    redoc_url=f"/api/{settings.API_VERSION}/redoc",
    openapi_url=f"/api/{settings.API_VERSION}/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SECURITY MIDDLEWARE - CRITICAL SECURITY STACK
# Order matters: Security monitoring first, then protection layers

# 1. Security monitoring (logs all security events)
app.add_middleware(SecurityMonitoringMiddleware)

# 2. CSRF protection (prevents cross-site request forgery)
app.add_middleware(CSRFProtectionMiddleware, secret_key=settings.SECRET_KEY)

# 3. Enhanced input validation (prevents XSS, SQL injection, path traversal)
app.add_middleware(EnhancedInputValidationMiddleware)

# 4. Rate limiting (prevents abuse)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)

# 5. Security headers (prevents clickjacking, XSS, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# PERFORMANCE MONITORING MIDDLEWARE - CRITICAL FOR OPTIMIZATION
# Order matters: Performance monitoring first, then system metrics

# 6. Performance monitoring (tracks API performance)
app.add_middleware(PerformanceMonitoringMiddleware)

# 7. Database query monitoring (tracks DB performance)
app.add_middleware(DatabaseQueryMonitoringMiddleware)

# 8. Cache performance monitoring (tracks cache performance)
app.add_middleware(CachePerformanceMiddleware)

# 9. System metrics collection (tracks system resources)
app.add_middleware(SystemMetricsMiddleware)

# 10. Performance alerts (checks for performance issues)
app.add_middleware(PerformanceAlertMiddleware)

# Custom middleware
app.middleware("http")(error_handler_middleware)
app.add_middleware(RateLimiterMiddleware)

# Include API routes
app.include_router(api_router, prefix=f"/api/{settings.API_VERSION}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "HR Management System API",
        "version": settings.API_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
