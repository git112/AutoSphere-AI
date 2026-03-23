"""
SEO Optimization Models
Pydantic schemas for SEO analysis requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class SEOOptimizeRequest(BaseModel):
    """Request model for the SEO optimization endpoint."""
    input_type: Literal["text", "url", "generated"] = "text"
    content: Optional[str] = None
    url: Optional[str] = None
    target_keywords: List[str] = Field(default_factory=list)
    content_type: Literal["blog", "social", "article"] = "blog"

    class Config:
        json_schema_extra = {
            "example": {
                "input_type": "text",
                "content": "How AI is transforming digital marketing in 2025...",
                "target_keywords": ["AI", "digital marketing", "2025"],
                "content_type": "blog"
            }
        }


class DimensionScore(BaseModel):
    """Individual dimension score with label and details."""
    name: str
    score: int = Field(ge=0, le=100)
    details: str = ""


class SEOMetadata(BaseModel):
    """Optimized metadata suggestions."""
    title: str = ""
    meta_description: str = ""
    hashtags: List[str] = Field(default_factory=list)


class SEOOptimizeResponse(BaseModel):
    """Response model for the SEO optimization endpoint."""
    optimized_content: str
    seo_score: int = Field(ge=0, le=100)
    dimension_scores: List[DimensionScore]
    improvements: List[str]
    suggested_keywords: List[str]
    metadata: SEOMetadata
    original_content: str = ""


class URLFetchRequest(BaseModel):
    """Request model for the URL fetch endpoint."""
    url: str

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.com/blog/ai-marketing"
            }
        }


class URLFetchResponse(BaseModel):
    """Response model for the URL fetch endpoint."""
    title: str = ""
    meta_description: str = ""
    headings: List[str] = Field(default_factory=list)
    body_text: str = ""
    url: str = ""
