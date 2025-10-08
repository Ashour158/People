"""Error handling middleware"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
import structlog
import traceback

logger = structlog.get_logger()


class AppError(Exception):
    """Base application error"""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppError):
    """Resource not found error"""
    def __init__(self, message: str = "Resource not found", details: dict = None):
        super().__init__(message, status_code=404, details=details)


class ValidationError(AppError):
    """Validation error"""
    def __init__(self, message: str = "Validation error", details: dict = None):
        super().__init__(message, status_code=400, details=details)


class UnauthorizedError(AppError):
    """Unauthorized error"""
    def __init__(self, message: str = "Unauthorized", details: dict = None):
        super().__init__(message, status_code=401, details=details)


class ForbiddenError(AppError):
    """Forbidden error"""
    def __init__(self, message: str = "Forbidden", details: dict = None):
        super().__init__(message, status_code=403, details=details)


async def error_handler_middleware(request: Request, call_next):
    """Global error handler middleware"""
    try:
        response = await call_next(request)
        return response
    except AppError as e:
        logger.error(
            "Application error",
            error=e.message,
            status_code=e.status_code,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=e.status_code,
            content={
                "success": False,
                "error": e.message,
                "details": e.details,
            },
        )
    except Exception as e:
        logger.error(
            "Unhandled exception",
            error=str(e),
            traceback=traceback.format_exc(),
            path=request.url.path,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "Internal server error",
                "detail": str(e) if request.app.debug else None,
            },
        )
