"""
Content Generation Routes
API endpoints for the production-ready AI Content Composer.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime
import logging

from app.services.llm_service import llm_service
from app.services.image_service import image_service
from app.services.platform_formatter import platform_formatter
from app.services.engagement_service import engagement_service
from app.services.user_service import user_service
from app.services.posting_time_service import posting_time_service
from app.models.post_model import Post, PostFormattedContent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/content", tags=["content"])

class FullPostRequest(BaseModel):
    """Input parameters for AI Post Composer"""
    user_id: str
    topic: str
    platform: Literal["Instagram", "LinkedIn", "Twitter"]
    tone: Literal["Professional", "Friendly", "Promotional"]
    goal: Literal["Engagement", "Sales", "Awareness"]
    image_style: Literal["Minimal", "Corporate", "Story"]
    ai_mode: Literal["default", "custom"] = "default"

class FullPostResponse(BaseModel):
    """Structured output for the frontend"""
    caption: str
    hashtags: str
    cta: str
    formatted: PostFormattedContent
    image_url: Optional[str]
    engagement_score_estimate: int
    post_id: str

@router.post("/generate-full-post", response_model=FullPostResponse)
async def generate_full_post(request: FullPostRequest):
    """
    Main engine for AI Content Generation.
    Integrates LLM, Image, Formatter, and Engagement services.
    """
    try:
        # 1. Handle BYOK logic
        decrypted_key = None
        if request.ai_mode == "custom":
            decrypted_key = await user_service.get_user_api_key(request.user_id)
            if not decrypted_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Custom AI mode selected but no API key found for user"
                )

        # 2. Generate structured text via Gemini
        raw_content = await llm_service.generate_post_content(
            topic=request.topic,
            platform=request.platform,
            tone=request.tone,
            goal=request.goal,
            user_api_key=decrypted_key
        )

        caption = raw_content.get("caption", "")
        hashtags = raw_content.get("hashtags", "")
        cta = raw_content.get("cta", "")

        # 3. Generate platform-specific formats
        formatted_ig = platform_formatter.format_instagram(caption, hashtags)
        formatted_li = platform_formatter.format_linkedin(caption, hashtags, cta)
        formatted_tw = platform_formatter.format_twitter(caption, hashtags)

        # 4. Calculate engagement score
        score = engagement_service.calculate_score(caption, hashtags, cta)

        # 5. Optional image generation
        image_url = await image_service.generate_image(request.topic, request.image_style)

        # 6. Auto-save to database
        from app.database.mongodb import mongodb
        
        new_post = Post(
            user_id=request.user_id,
            topic=request.topic,
            platform=request.platform,
            tone=request.tone,
            goal=request.goal,
            caption=caption,
            hashtags=hashtags,
            cta=cta,
            formatted=PostFormattedContent(
                instagram=formatted_ig,
                linkedin=formatted_li,
                twitter=formatted_tw
            ),
            image_url=image_url,
            engagement_score_estimate=score,
            status="generated",
            is_draft=True
        )
        
        post_dict = new_post.model_dump(by_alias=True, exclude_none=True)
        if "_id" in post_dict: del post_dict["_id"]
        
        insert_result = await mongodb.posts.insert_one(post_dict)
        post_id = str(insert_result.inserted_id)

        return FullPostResponse(
            caption=caption,
            hashtags=hashtags,
            cta=cta,
            formatted=PostFormattedContent(
                instagram=formatted_ig,
                linkedin=formatted_li,
                twitter=formatted_tw
            ),
            image_url=image_url,
            engagement_score_estimate=score,
            post_id=post_id
        )

    except Exception as e:
        logger.error(f"Post generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Post generation failed: {str(e)}"
        )

@router.patch("/posts/{post_id}")
async def update_post(post_id: str, updates: dict):
    """Updates an existing post/draft (e.g., for scheduling)"""
    try:
        from app.database.mongodb import mongodb
        from bson import ObjectId
        
        # Handle datetime conversion if scheduled_at is provided
        if "scheduled_at" in updates and updates["scheduled_at"]:
            try:
                from zoneinfo import ZoneInfo
                ist_zone = ZoneInfo("Asia/Kolkata")
                raw_time = updates["scheduled_at"].replace("Z", "")
                dt_naive = datetime.fromisoformat(raw_time)
                dt_ist = dt_naive.replace(tzinfo=ist_zone)
                dt_utc = dt_ist.astimezone(ZoneInfo("UTC"))
                updates["scheduled_at"] = dt_utc
                
                # Queue the job if status is scheduled
                if updates.get("status") == "scheduled":
                    from app.services.scheduler_service import scheduler_service
                    scheduler_service.schedule_post(post_id, dt_utc)
            except ValueError:
                pass
        
        # Immediate publish
        if updates.get("status") == "published" and "scheduled_at" not in updates:
            from app.services.scheduler_service import scheduler_service
            # Run the job synchronously or schedule it for immediate execution
            import asyncio
            asyncio.create_task(scheduler_service.publish_post_job(post_id))
            
        result = await mongodb.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
            
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-draft")
async def save_draft(post: Post):
    """Saves a generated post as a draft in MongoDB"""
    try:
        from app.database.mongodb import mongodb
        post_dict = post.model_dump(by_alias=True, exclude_none=True)
        # Remove ID if present to let Mongo generate it
        if "_id" in post_dict: del post_dict["_id"]
        
        result = await mongodb.posts.insert_one(post_dict)
        return {"success": True, "draft_id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Failed to save draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drafts/{user_id}", response_model=List[Post])
async def get_drafts(user_id: str):
    """Retrieves all drafts for a given user"""
    try:
        from app.database.mongodb import mongodb
        cursor = mongodb.posts.find({"user_id": user_id, "is_draft": True}).sort("created_at", -1)
        drafts = await cursor.to_list(length=100)
        # Convert _id to string for pydantic
        for d in drafts:
            d["_id"] = str(d["_id"])
        return drafts
    except Exception as e:
        logger.error(f"Failed to fetch drafts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scheduled/{user_id}", response_model=List[Post])
async def get_scheduled_posts(user_id: str):
    """Retrieves all scheduled posts for a given user, sorted by scheduled_at asc"""
    try:
        from app.database.mongodb import mongodb
        from zoneinfo import ZoneInfo
        ist_zone = ZoneInfo("Asia/Kolkata")
        
        cursor = mongodb.posts.find({"user_id": user_id, "status": "scheduled"}).sort("scheduled_at", 1)
        posts = await cursor.to_list(length=100)
        for p in posts:
            p["_id"] = str(p["_id"])
            if p.get("scheduled_at"):
                dt_utc = p["scheduled_at"]
                if dt_utc.tzinfo is None:
                    dt_utc = dt_utc.replace(tzinfo=ZoneInfo("UTC"))
                dt_ist = dt_utc.astimezone(ist_zone)
                p["scheduled_at"] = dt_ist
        return posts
    except Exception as e:
        logger.error(f"Failed to fetch scheduled posts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/posting-times/{platform}", response_model=List[str])
async def get_posting_times(platform: str):
    """Retrieves suggested posting times for a platform"""
    return posting_time_service.get_best_posting_times(platform)
