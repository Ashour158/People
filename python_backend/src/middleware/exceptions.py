"""
Custom exceptions for the HR Management System.
"""


class AppError(Exception):
    """Base application error."""
    
    def __init__(self, status_code: int, message: str, code: str = None):
        self.status_code = status_code
        self.message = message
        self.code = code
        super().__init__(self.message)


class UnauthorizedError(AppError):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(401, message, "UNAUTHORIZED")


class ForbiddenError(AppError):
    """Raised when user lacks required permissions."""
    
    def __init__(self, message: str = "Forbidden"):
        super().__init__(403, message, "FORBIDDEN")


class NotFoundError(AppError):
    """Raised when a resource is not found."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(404, message, "NOT_FOUND")


class ValidationError(AppError):
    """Raised when validation fails."""
    
    def __init__(self, message: str = "Validation error"):
        super().__init__(400, message, "VALIDATION_ERROR")


class ConflictError(AppError):
    """Raised when there's a conflict (e.g., duplicate resource)."""
    
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(409, message, "CONFLICT")
