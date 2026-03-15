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
            logger.info(f"Publishing scheduled post: {post_id}")
            # Mock publishing process. Update status to 'published'
            result = await mongodb.posts.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": {"status": "published"}}
            )
            if result.modified_count > 0:
                logger.info(f"Successfully published post: {post_id}")
            else:
                logger.warning(f"Post {post_id} not found or already published.")
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
