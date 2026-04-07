from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import logging
from typing import Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.instagram import InstagramAccount, InstagramPostRequest, InstagramPostResponse
from app.services.instagram_service import instagram_service
from app.utils.jwt import jwt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/instagram", tags=["instagram"])

def get_current_user_token(request: Request) -> dict:
    """Helper to extract user token payload from header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    token = auth_header.replace("Bearer ", "")
    payload = jwt_service.verify_token(token, token_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return payload

class AuthUrlResponse(BaseModel):
    url: str

@router.get("/auth-url", response_model=AuthUrlResponse)
async def get_instagram_auth_url(request: Request):
    """
    Returns the Meta OAuth URL.
    Encodes the user_id into the OAuth state parameter so we know 
    who to link the account to on callback.
    """
    try:
        user_payload = get_current_user_token(request)
        user_id = user_payload.get("sub")
        
        # In a real system, you might encrypt this user_id or use a signed JWT as state to prevent CSRF.
        # But passing user_id explicitly is a start.
        state = user_id
        url = instagram_service.get_auth_url(state)
        
        return AuthUrlResponse(url=url)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/callback")
async def instagram_oauth_callback(
    code: str, 
    state: str,
    error: Optional[str] = None,
    error_reason: Optional[str] = None,
    error_description: Optional[str] = None
):
    """
    Handles the redirect from Meta after the user grants permissions.
    """
    frontend_url = "http://localhost:5173/dashboard" # Typically configured in ENV
    
    if error:
        logger.error(f"Meta OAuth Error: {error_description}")
        return RedirectResponse(url=f"{frontend_url}?ig_error={error_description}")
        
    user_id = state
    
    # 1. Exchange code for access token
    access_token, token_error = await instagram_service.exchange_code_for_token(code)
    if token_error or not access_token:
        return RedirectResponse(url=f"{frontend_url}?ig_error=failed_token_exchange")

    # 2. Get Instagram Business Account ID
    ig_user_id, fb_page_id, ig_error = await instagram_service.get_instagram_business_account(access_token)
    if ig_error or not ig_user_id:
        return RedirectResponse(url=f"{frontend_url}?ig_error={ig_error or 'no_ig_account'}")

    # 3. Store in database
    try:
        db = get_db()
        # Create token model
        # Token expiry for a long lived token is typically 60 days
        expiry = datetime.utcnow() + timedelta(days=60)
        
        ig_account = InstagramAccount(
            user_id=user_id,
            instagram_user_id=ig_user_id,
            facebook_page_id=fb_page_id,
            access_token=access_token,
            token_expiry=expiry
        )
        
        # Upsert operation using dictionary
        await db["instagram_accounts"].update_one(
            {"user_id": user_id},
            {"$set": ig_account.model_dump(exclude={"id"})},
            upsert=True
        )
        
        return RedirectResponse(url=f"{frontend_url}?ig_success=true")
    except Exception as e:
        logger.error(f"Database error saving IG account: {e}")
        return RedirectResponse(url=f"{frontend_url}?ig_error=database_error")

@router.get("/status")
async def get_instagram_status(request: Request):
    """Check if the current user has connected Instagram"""
    user_payload = get_current_user_token(request)
    user_id = user_payload.get("sub")
    
    try:
        db = get_db()
        account = await db["instagram_accounts"].find_one({"user_id": user_id})
        is_connected = account is not None
        return {"connected": is_connected}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database lookup failed")

@router.post("/publish", response_model=InstagramPostResponse)
async def publish_to_instagram(payload: InstagramPostRequest, request: Request):
    """
    Publish an image and caption to the connected Instagram Business account.
    """
    user_payload = get_current_user_token(request)
    user_id = user_payload.get("sub")
    
    try:
        db = get_db()
        account_doc = await db["instagram_accounts"].find_one({"user_id": user_id})
        
        if not account_doc:
            raise HTTPException(status_code=400, detail="Instagram not connected")
            
        ig_user_id = account_doc.get("instagram_user_id")
        access_token = account_doc.get("access_token")
        
        # Check token expiry if possible, for now just use it
        
        # Step 1: Create Container
        creation_id, creation_err = await instagram_service.create_media_container(
            ig_user_id=ig_user_id,
            image_url=payload.image_url,
            caption=payload.caption or "",
            access_token=access_token
        )
        
        if creation_err:
            raise HTTPException(status_code=400, detail=f"Failed to create media: {creation_err}")
            
        # Step 2: Publish Container
        post_id, publish_err = await instagram_service.publish_media(
            ig_user_id=ig_user_id,
            creation_id=creation_id,
            access_token=access_token
        )
        
        if publish_err:
            raise HTTPException(status_code=400, detail=f"Failed to publish media: {publish_err}")
            
        return InstagramPostResponse(
            success=True,
            message="Post successfully published to Instagram",
            post_id=post_id,
            creation_id=creation_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing to Instagram: {e}")
        raise HTTPException(status_code=500, detail=f"Publish failed: {str(e)}")
