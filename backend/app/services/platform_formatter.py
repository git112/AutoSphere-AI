"""
Platform Formatter Service
Handles formatting of captions and hashtags for specific social media platforms.
"""

import re
import logging

logger = logging.getLogger(__name__)

class PlatformFormatter:
    """Service to format AI content for different platforms"""
    
    @staticmethod
    def format_instagram(caption: str, hashtags: str) -> str:
        """
        Formats content for Instagram:
        - Short paragraphs with spacing
        - Emojis throughout
        - Hashtags at the very bottom
        """
        # Ensure hashtags are clean
        clean_hashtags = " ".join([h if h.startswith("#") else f"#{h}" for h in hashtags.split()])
        
        # Add spacing between paragraphs if not present
        formatted_caption = caption.replace("\n", "\n\n")
        # Remove triple newlines
        formatted_caption = re.sub(r'\n{3,}', '\n\n', formatted_caption)
        
        return f"{formatted_caption.strip()}\n\n.\n.\n.\n{clean_hashtags}"

    @staticmethod
    def format_linkedin(caption: str, hashtags: str, cta: str) -> str:
        """
        Formats content for LinkedIn:
        - Hook line (first sentence)
        - Professional spacing
        - CTA clearly visible
        - Limited hashtags (max 3-5)
        """
        paragraphs = caption.split("\n")
        hook = paragraphs[0] if paragraphs else ""
        rest = "\n\n".join(paragraphs[1:]) if len(paragraphs) > 1 else ""
        
        # Limit hashtags to 5
        hashtag_list = hashtags.split()
        limited_hashtags = " ".join(hashtag_list[:5])
        clean_hashtags = " ".join([h if h.startswith("#") else f"#{h}" for h in limited_hashtags.split()])

        formatted = f"{hook}\n\n{rest}\n\n{cta}\n\n{clean_hashtags}"
        # Clean up multi-newlines
        formatted = re.sub(r'\n{3,}', '\n\n', formatted)
        
        return formatted.strip()

# Singleton instance
platform_formatter = PlatformFormatter()
