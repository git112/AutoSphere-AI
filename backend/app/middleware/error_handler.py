"""
Error Handler Middleware
Centralized error handling for the application
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors
    
    Args:
        request: FastAPI request
        exc: Validation exception
        
    Returns:
        JSON response with error details
    """
    logger.warning(f"Validation error: {exc.errors()}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "errors": exc.errors()
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle general exceptions
    
    Args:
        request: FastAPI request
        exc: Exception
        
    Returns:
        JSON response with error details
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc)
        }
    )
