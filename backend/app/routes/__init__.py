"""Routes package"""

from .content import router as content_router
from .auth import router as auth_router

__all__ = ["content_router", "auth_router"]
