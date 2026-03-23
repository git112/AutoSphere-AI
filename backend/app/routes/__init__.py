"""Routes package"""

from .content import router as content_router
from .auth import router as auth_router
from .seo import router as seo_router

__all__ = ["content_router", "auth_router", "seo_router"]
