"""
SEO Optimization Routes
API endpoints for the SEO Optimization Module.
"""

from fastapi import APIRouter, HTTPException, status
import logging

from app.models.seo import (
    SEOOptimizeRequest,
    SEOOptimizeResponse,
    SEOMetadata,
    URLFetchRequest,
    URLFetchResponse,
)
from app.services.seo.input_handler import input_handler
from app.services.seo.content_parser import content_parser
from app.services.seo.seo_analyzer import seo_analyzer
from app.services.seo.optimizer import seo_optimizer
from app.services.seo.scoring_engine import scoring_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/seo", tags=["seo"])


@router.post("/optimize", response_model=SEOOptimizeResponse)
async def optimize_content(request: SEOOptimizeRequest):
    """
    Full SEO optimization pipeline.
    Input → Parse → Analyze → Optimize → Score → Output
    
    Supports three input types:
      - text: raw content pasted by user
      - url: fetches and extracts content from a web page
      - generated: content from the Content Composer
    """
    try:
        # ── Step 1: Input Handling ──────────────────────────────────────────
        raw_content = ""
        url_data = None

        if request.input_type == "url":
            if not request.url:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="URL is required for url input type"
                )
            url_data = await input_handler.fetch_url(request.url)
            raw_content = input_handler.resolve_content("url", url_data=url_data)

        elif request.input_type in ("text", "generated"):
            if not request.content:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Content is required for text/generated input type"
                )
            raw_content = request.content

        if not raw_content or not raw_content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No content to optimize"
            )

        # ── Step 2: Content Parsing ─────────────────────────────────────────
        parsed = content_parser.parse(raw_content)

        # ── Step 3: SEO Analysis ────────────────────────────────────────────
        analysis = seo_analyzer.analyze(
            parsed=parsed,
            target_keywords=request.target_keywords,
            content_type=request.content_type,
        )

        # ── Step 4: Optimization ────────────────────────────────────────────
        keywords_to_use = request.target_keywords or analysis.get("auto_keywords", [])
        optimization = seo_optimizer.optimize(
            original_content=raw_content,
            parsed=parsed,
            analysis=analysis,
            target_keywords=keywords_to_use,
            content_type=request.content_type,
        )

        # ── Step 5: Scoring ─────────────────────────────────────────────────
        scoring = scoring_engine.calculate(analysis)

        # ── Step 6: Build Response ──────────────────────────────────────────
        meta = optimization["metadata"]
        return SEOOptimizeResponse(
            optimized_content=optimization["optimized_content"],
            seo_score=scoring["seo_score"],
            dimension_scores=scoring["dimension_scores"],
            improvements=optimization["improvements"],
            suggested_keywords=optimization["suggested_keywords"],
            metadata=SEOMetadata(
                title=meta.get("title", ""),
                meta_description=meta.get("meta_description", ""),
                hashtags=meta.get("hashtags", []),
            ),
            original_content=raw_content,
        )

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"SEO optimization validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"SEO optimization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SEO optimization failed: {str(e)}"
        )


@router.post("/fetch-url", response_model=URLFetchResponse)
async def fetch_url(request: URLFetchRequest):
    """
    Fetch and extract content from a URL.
    Returns title, meta description, headings, and body text.
    """
    try:
        url_data = await input_handler.fetch_url(request.url)
        return URLFetchResponse(**url_data)

    except ValueError as e:
        logger.error(f"URL fetch validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"URL fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"URL fetch failed: {str(e)}"
        )
