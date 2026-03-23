"""
Input Handler Service
Detects input type and fetches content from URLs when needed.
"""

import logging
import httpx
from bs4 import BeautifulSoup
from typing import Dict, List

logger = logging.getLogger(__name__)


class InputHandler:
    """Handles different input types: raw text, URL, or generated content."""

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    async def fetch_url(self, url: str) -> Dict:
        """
        Fetch HTML from a URL and extract SEO-relevant content.
        Returns dict with title, meta_description, headings, body_text.
        """
        try:
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers=self.HEADERS,
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

            html = response.text
            soup = BeautifulSoup(html, "lxml")

            # Remove script, style, nav, footer, header tags
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
                tag.decompose()

            # Extract title
            title = ""
            title_tag = soup.find("title")
            if title_tag:
                title = title_tag.get_text(strip=True)

            # Extract meta description
            meta_description = ""
            meta_tag = soup.find("meta", attrs={"name": "description"})
            if meta_tag:
                meta_description = meta_tag.get("content", "")

            # Extract headings (H1, H2, H3)
            headings = self._extract_headings(soup)

            # Extract body text
            body_text = self._extract_body_text(soup)

            return {
                "title": title,
                "meta_description": meta_description,
                "headings": headings,
                "body_text": body_text,
                "url": url,
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching URL {url}: {e}")
            raise ValueError(f"Failed to fetch URL: HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Request error fetching URL {url}: {e}")
            raise ValueError(f"Failed to fetch URL: {str(e)}")
        except Exception as e:
            logger.error(f"Error fetching URL {url}: {e}")
            raise ValueError(f"Failed to fetch URL: {str(e)}")

    def _extract_headings(self, soup: BeautifulSoup) -> List[str]:
        """Extract H1, H2, H3 headings from parsed HTML."""
        headings = []
        for level in ["h1", "h2", "h3"]:
            for tag in soup.find_all(level):
                text = tag.get_text(strip=True)
                if text:
                    headings.append(f"[{level.upper()}] {text}")
        return headings

    def _extract_body_text(self, soup: BeautifulSoup) -> str:
        """Extract clean body text from parsed HTML."""
        # Try to find main content area
        main = soup.find("main") or soup.find("article") or soup.find("body")
        if not main:
            return ""

        # Get text with newlines between block elements
        paragraphs = []
        for elem in main.find_all(["p", "li", "td", "blockquote"]):
            text = elem.get_text(strip=True)
            if text and len(text) > 10:
                paragraphs.append(text)

        return "\n\n".join(paragraphs)

    def resolve_content(self, input_type: str, content: str = None, url_data: Dict = None) -> str:
        """
        Resolve final content string based on input type.
        For URL inputs, combines extracted elements into analyzable text.
        """
        if input_type == "url" and url_data:
            parts = []
            if url_data.get("title"):
                parts.append(url_data["title"])
            if url_data.get("meta_description"):
                parts.append(url_data["meta_description"])
            for heading in url_data.get("headings", []):
                # Remove the [H1] prefix for content analysis
                clean = heading.split("] ", 1)[-1] if "] " in heading else heading
                parts.append(clean)
            if url_data.get("body_text"):
                parts.append(url_data["body_text"])
            return "\n\n".join(parts)

        return content or ""


input_handler = InputHandler()
