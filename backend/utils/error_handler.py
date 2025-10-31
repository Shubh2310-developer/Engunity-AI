"""
Professional error handling utilities
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import traceback
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class AppError(Exception):
    """Base application error"""
    def __init__(self, message: str, status_code: int = 500, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "INTERNAL_ERROR"
        super().__init__(self.message)

class ValidationError(AppError):
    """Validation error"""
    def __init__(self, message: str):
        super().__init__(message, status_code=400, error_code="VALIDATION_ERROR")

class NotFoundError(AppError):
    """Resource not found error"""
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", status_code=404, error_code="NOT_FOUND")

class AuthenticationError(AppError):
    """Authentication error"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status_code=401, error_code="AUTHENTICATION_ERROR")

class AuthorizationError(AppError):
    """Authorization error"""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403, error_code="AUTHORIZATION_ERROR")

class RateLimitError(AppError):
    """Rate limit exceeded error"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, status_code=429, error_code="RATE_LIMIT_EXCEEDED")

async def app_error_handler(request: Request, exc: AppError):
    """Handle application errors"""
    error_id = str(uuid.uuid4())

    logger.error(
        f"AppError {error_id}: {exc.error_code} - {exc.message}",
        extra={
            'error_id': error_id,
            'error_code': exc.error_code,
            'status_code': exc.status_code,
            'path': request.url.path,
            'method': request.method,
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            'error': exc.error_code,
            'message': exc.message,
            'error_id': error_id,
            'timestamp': datetime.utcnow().isoformat(),
        }
    )

async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    error_id = str(uuid.uuid4())

    logger.warning(
        f"ValidationError {error_id}: {exc.errors()}",
        extra={
            'error_id': error_id,
            'path': request.url.path,
            'method': request.method,
        }
    )

    return JSONResponse(
        status_code=422,
        content={
            'error': 'VALIDATION_ERROR',
            'message': 'Invalid request data',
            'details': exc.errors(),
            'error_id': error_id,
            'timestamp': datetime.utcnow().isoformat(),
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    error_id = str(uuid.uuid4())

    logger.error(
        f"HTTPException {error_id}: {exc.status_code} - {exc.detail}",
        extra={
            'error_id': error_id,
            'status_code': exc.status_code,
            'path': request.url.path,
            'method': request.method,
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            'error': 'HTTP_ERROR',
            'message': exc.detail,
            'error_id': error_id,
            'timestamp': datetime.utcnow().isoformat(),
        }
    )

async def unhandled_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions"""
    error_id = str(uuid.uuid4())

    logger.error(
        f"UnhandledException {error_id}: {str(exc)}",
        exc_info=True,
        extra={
            'error_id': error_id,
            'path': request.url.path,
            'method': request.method,
            'traceback': traceback.format_exc(),
        }
    )

    return JSONResponse(
        status_code=500,
        content={
            'error': 'INTERNAL_ERROR',
            'message': 'An unexpected error occurred',
            'error_id': error_id,
            'timestamp': datetime.utcnow().isoformat(),
            # Only include details in development
            **(
                {'details': str(exc)}
                if logger.level == logging.DEBUG
                else {}
            ),
        }
    )

def setup_error_handlers(app):
    """Setup all error handlers"""
    from fastapi.exceptions import RequestValidationError
    from fastapi import HTTPException

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    logger.info("Error handlers configured")
