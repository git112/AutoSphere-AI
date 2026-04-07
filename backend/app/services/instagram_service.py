import os
import httpx
import logging
from typing import Tuple, Optional, Any

logger = logging.getLogger(__name__)

class InstagramService:
    def __init__(self):
        self.client_id = os.getenv("META_CLIENT_ID", "")
        self.client_secret = os.getenv("META_CLIENT_SECRET", "")
        self.redirect_uri = os.getenv("META_REDIRECT_URI", "http://localhost:8000/api/instagram/callback")
        self.api_version = os.getenv("META_GRAPH_VERSION", "v19.0")
        self.base_url = f"https://graph.facebook.com/{self.api_version}"

    def get_auth_url(self, state: str) -> str:
        """Construct the Meta OAuth URL"""
        scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
        
        return (
            f"https://www.facebook.com/{self.api_version}/dialog/oauth?"
            f"client_id={self.client_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"state={state}&"
            f"scope={scopes}"
        )

    async def exchange_code_for_token(self, code: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Exchange OAuth code for a short-lived access token,
        then exchange THAT for a long-lived access token.
        """
        if not self.client_id or not self.client_secret:
            return None, "Meta credentials not configured."

        async with httpx.AsyncClient() as client:
            # 1. Get short-lived token
            url = f"{self.base_url}/oauth/access_token"
            params = {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "client_secret": self.client_secret,
                "code": code
            }
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                short_lived_token = data.get("access_token")
                
                if not short_lived_token:
                    return None, "Failed to retrieve access token from Meta."
                    
                # 2. Get long-lived token
                params_long = {
                    "grant_type": "fb_exchange_token",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "fb_exchange_token": short_lived_token
                }
                res_long = await client.get(url, params=params_long)
                res_long.raise_for_status()
                long_data = res_long.json()
                long_lived_token = long_data.get("access_token")
                
                return long_lived_token, None
            except Exception as e:
                logger.error(f"Error exchanging code for token: {e}")
                return None, str(e)

    async def get_instagram_business_account(self, access_token: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Fetches the user's Facebook pages, then finds the first page
        that has an associated Instagram Business Account.
        Returns: (ig_user_id, fb_page_id, error_message)
        """
        async with httpx.AsyncClient() as client:
            try:
                # 1. Get user pages
                pages_url = f"{self.base_url}/me/accounts"
                res_pages = await client.get(pages_url, params={"access_token": access_token})
                res_pages.raise_for_status()
                pages_data = res_pages.json()
                pages = pages_data.get("data", [])
                
                if not pages:
                    return None, None, "No Facebook Pages found for this user."
                    
                # 2. Iterate pages to find linked IG account
                for page in pages:
                    page_id = page.get("id")
                    page_token = page.get("access_token") # sometimes needed depending on endpoint, but user token with pages_read_engagement works
                    
                    ig_url = f"{self.base_url}/{page_id}"
                    params = {
                        "fields": "instagram_business_account",
                        "access_token": access_token
                    }
                    res_ig = await client.get(ig_url, params=params)
                    if res_ig.status_code == 200:
                        ig_data = res_ig.json()
                        ig_account = ig_data.get("instagram_business_account")
                        if ig_account:
                            return ig_account.get("id"), page_id, None
                            
                return None, None, "No linked Instagram Business Account found."
            except Exception as e:
                logger.error(f"Error fetching IG business account: {e}")
                return None, None, str(e)

    async def create_media_container(self, ig_user_id: str, image_url: str, caption: str, access_token: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Step 1 of posting to Instagram: Create the media container.
        """
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/{ig_user_id}/media"
            payload = {
                "image_url": image_url,
                "caption": caption,
                "access_token": access_token
            }
            try:
                response = await client.post(url, data=payload)
                response.raise_for_status()
                data = response.json()
                return data.get("id"), None
            except Exception as e:
                logger.error(f"Error creating media container: {response.text if 'response' in locals() else e}")
                return None, str(e)

    async def publish_media(self, ig_user_id: str, creation_id: str, access_token: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Step 2 of posting to Instagram: Publish the media container.
        """
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/{ig_user_id}/media_publish"
            payload = {
                "creation_id": creation_id,
                "access_token": access_token
            }
            try:
                response = await client.post(url, data=payload)
                response.raise_for_status()
                data = response.json()
                return data.get("id"), None
            except Exception as e:
                logger.error(f"Error publishing media: {response.text if 'response' in locals() else e}")
                return None, str(e)
                
instagram_service = InstagramService()
