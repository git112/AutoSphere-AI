"""
OTP Service
Handles generation, storage, and verification of one-time passwords
Used for: signup email verification, forgot-password reset
"""

import random
import string
import logging
from datetime import datetime, timedelta
from typing import Tuple, Optional

from app.database import get_db

logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 5
RATE_LIMIT_MAX = 3          # max OTPs per window
RATE_LIMIT_WINDOW_MINUTES = 10


class OtpService:
    """Service for OTP operations"""

    def _generate_code(self) -> str:
        """Generate a secure 6-digit numeric OTP"""
        return ''.join(random.choices(string.digits, k=6))

    async def send_otp(self, email: str, purpose: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Generate and store an OTP for the given email and purpose.
        Returns (otp_code, error_message).

        Args:
            email:   recipient email address
            purpose: 'signup' | 'password_reset'
        """
        try:
            db = get_db()
            otps_col = db["otps"]

            # ── Rate limiting ──────────────────────────────────────────────────
            window_start = datetime.utcnow() - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
            recent_count = await otps_col.count_documents({
                "email": email,
                "purpose": purpose,
                "created_at": {"$gte": window_start}
            })
            if recent_count >= RATE_LIMIT_MAX:
                return None, (
                    f"Too many OTP requests. Please wait {RATE_LIMIT_WINDOW_MINUTES} minutes "
                    "before requesting a new OTP."
                )

            # ── Invalidate previous pending OTPs for this email+purpose ────────
            await otps_col.update_many(
                {"email": email, "purpose": purpose, "is_used": False},
                {"$set": {"is_used": True}}
            )

            # ── Create new OTP ─────────────────────────────────────────────────
            otp_code = self._generate_code()
            expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

            otp_doc = {
                "email": email,
                "purpose": purpose,
                "otp": otp_code,
                "is_used": False,
                "expires_at": expires_at,
                "created_at": datetime.utcnow(),
            }
            await otps_col.insert_one(otp_doc)

            logger.info(f"OTP created for {email} (purpose={purpose})")
            return otp_code, None

        except Exception as e:
            logger.error(f"OTP generation failed for {email}: {e}")
            return None, f"Failed to generate OTP: {str(e)}"

    async def verify_otp(self, email: str, otp: str, purpose: str) -> Tuple[bool, Optional[str]]:
        """
        Verify an OTP for the given email and purpose.
        Returns (success, error_message).

        Args:
            email:   email address used when generating the OTP
            otp:     user-supplied 6-digit code
            purpose: 'signup' | 'password_reset'
        """
        try:
            db = get_db()
            otps_col = db["otps"]

            # Find the most recent unused, unexpired OTP
            otp_doc = await otps_col.find_one(
                {
                    "email": email,
                    "purpose": purpose,
                    "is_used": False,
                    "expires_at": {"$gt": datetime.utcnow()},
                },
                sort=[("created_at", -1)],
            )

            if not otp_doc:
                return False, "OTP is invalid or has expired. Please request a new one."

            if otp_doc["otp"] != otp:
                return False, "Incorrect OTP. Please try again."

            # Mark OTP as used
            await otps_col.update_one(
                {"_id": otp_doc["_id"]},
                {"$set": {"is_used": True}}
            )

            logger.info(f"OTP verified for {email} (purpose={purpose})")
            return True, None

        except Exception as e:
            logger.error(f"OTP verification failed for {email}: {e}")
            return False, f"OTP verification failed: {str(e)}"


# Singleton instance
otp_service = OtpService()
