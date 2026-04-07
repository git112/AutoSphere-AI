import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        
    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started.")

    def shutdown(self):
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler shutdown.")

    async def publish_post_job(self, post_id: str):
        """Worker function that handles actual publishing of the post."""
        try:
            from app.database.mongodb import mongodb
            from app.database import get_db
            from app.services.instagram_service import instagram_service
            logger.info(f"Publishing scheduled post: {post_id}")
            
            # Fetch the post
            post = await mongodb.posts.find_one({"_id": ObjectId(post_id)})
            if not post:
                logger.warning(f"Post {post_id} not found.")
                return

            platform = post.get("platform", "").lower()
            user_id = post.get("user_id")
            
            if platform == "instagram":
                # Fetch IG account
                db = get_db()
                account_doc = await db["instagram_accounts"].find_one({"user_id": user_id})
                
                if account_doc:
                    ig_user_id = account_doc.get("instagram_user_id")
                    access_token = account_doc.get("access_token")
                    image_url = post.get("image_url")
                    caption = post.get("caption", "")
                    
                    if image_url:
                        # 1. Create media
                        creation_id, err = await instagram_service.create_media_container(
                            ig_user_id=ig_user_id,
                            image_url=image_url,
                            caption=caption,
                            access_token=access_token
                        )
                        
                        if not err and creation_id:
                            # 2. Publish media
                            post_obj_id, pub_err = await instagram_service.publish_media(
                                ig_user_id=ig_user_id,
                                creation_id=creation_id,
                                access_token=access_token
                            )
                            if pub_err:
                                logger.error(f"Failed to publish IG media: {pub_err}")
                            else:
                                logger.info(f"Successfully published to Instagram: {post_obj_id}")
                        else:
                            logger.error(f"Failed to create IG media container: {err}")
                    else:
                        logger.error(f"Instagram requires an image_url but post {post_id} doesn't have one.")
                else:
                    logger.error(f"Cannot publish post {post_id}. User {user_id} has no Instagram account linked.")

            # Update status to 'published'
            result = await mongodb.posts.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": {"status": "published"}}
            )
            if result.modified_count > 0:
                logger.info(f"Successfully updated post {post_id} status to published")
        except Exception as e:
            logger.error(f"Error publishing post {post_id}: {e}")

    def schedule_post(self, post_id: str, run_date: datetime):
        """Adds a job to the scheduler to publish the post when time arrives."""
        try:
            # We add a one-off job using 'date' trigger
            self.scheduler.add_job(
                self.publish_post_job,
                trigger='date',
                run_date=run_date,
                args=[post_id],
                id=f"publish_{post_id}",
                replace_existing=True
            )
            logger.info(f"Job added to scheduler for post {post_id} at {run_date}")
        except Exception as e:
            logger.error(f"Failed to add job to scheduler: {e}")

scheduler_service = SchedulerService()
