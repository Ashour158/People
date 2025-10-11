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
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware, InputValidationMiddleware
from app.api.v1.router import api_router
from app.events.event_dispatcher import EventDispatcher

# Setup logging
setup_logging()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting HR Management System")
    
    # Initialize database
    await init_db()
    logger.info("✅ Database connected successfully")
    
    # Initialize Redis
    try:
        await init_redis()
        logger.info("✅ Redis connected successfully")
    except Exception as e:
        logger.warning(f"⚠️  Redis connection failed: {e}")
    
    # Initialize event dispatcher
    EventDispatcher.initialize()
    logger.info("✅ Event dispatcher initialized")
    
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(f"🚀 Server is running on port {settings.PORT}")
    logger.info(f"📦 Environment: {settings.ENVIRONMENT}")
    logger.info(f"📡 API Version: {settings.API_VERSION}")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    yield
    
    # Shutdown
    logger.info("Shutting down HR Management System")
    await close_db()
    await close_redis()
    logger.info("✅ Graceful shutdown completed")


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

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)
app.add_middleware(InputValidationMiddleware)

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
