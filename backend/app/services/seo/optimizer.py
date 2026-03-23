"""
SEO Optimizer Service
Generates optimized content and actionable improvement suggestions.
"""

import re
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class SEOOptimizer:
    """
    Generates optimized content and improvement suggestions
    based on analysis results.
    """

    def optimize(
        self,
        original_content: str,
        parsed: Dict,
        analysis: Dict,
        target_keywords: List[str],
        content_type: str,
    ) -> Dict:
        """
        Generate optimized content and suggestions.

        Returns dict with:
            optimized_content, improvements, suggested_keywords, metadata
        """
        improvements = self._generate_improvements(analysis, parsed, content_type)
        optimized = self._optimize_content(original_content, parsed, analysis, target_keywords)
        metadata = self._generate_metadata(parsed, target_keywords, content_type)
        suggested_keywords = self._suggest_additional_keywords(
            parsed, target_keywords, analysis.get("auto_keywords", [])
        )

        return {
            "optimized_content": optimized,
            "improvements": improvements,
            "suggested_keywords": suggested_keywords,
            "metadata": metadata,
        }

    def _generate_improvements(self, analysis: Dict, parsed: Dict, content_type: str) -> List[str]:
        """Generate actionable improvement suggestions based on analysis scores."""
        improvements = []

        # Keyword improvements
        kw = analysis.get("keyword_score", {})
        if kw.get("score", 0) < 50:
            improvements.append("🔑 Add target keywords to your headings and opening paragraph")
        if kw.get("score", 0) < 30:
            improvements.append("🔑 Keyword density is too low — naturally weave keywords into your content")

        # Content quality improvements
        cq = analysis.get("content_quality", {})
        if cq.get("score", 0) < 60:
            improvements.append("💡 Add power words like 'proven', 'essential', 'transform' to boost engagement")
        if "No questions" in cq.get("details", ""):
            improvements.append("❓ Add rhetorical questions to engage readers and break up content")
        if "No clear CTA" in cq.get("details", ""):
            improvements.append("📢 Add a clear call-to-action to guide your audience's next step")

        # Structure improvements
        st = analysis.get("structure_score", {})
        if st.get("score", 0) < 50 and content_type != "social":
            improvements.append("📐 Break content into sections with descriptive H2/H3 headings")
        if "one long block" in st.get("details", "").lower():
            improvements.append("📝 Split long text into shorter paragraphs (3-4 sentences each)")
        if st.get("score", 0) < 70 and "Lists" not in st.get("details", ""):
            improvements.append("📋 Use bullet points or numbered lists to improve scannability")

        # Readability improvements
        rd = analysis.get("readability_score", {})
        if "shorten" in rd.get("details", "").lower():
            improvements.append("✂️ Shorten sentences — aim for 15-20 words per sentence on average")
        if "complex vocabulary" in rd.get("details", "").lower():
            improvements.append("📖 Simplify vocabulary — use common words your audience understands")
        if "passive voice" in rd.get("details", "").lower():
            improvements.append("✍️ Convert passive voice to active voice for clearer writing")

        # Intent improvements
        im = analysis.get("intent_match", {})
        if im.get("score", 0) < 40:
            improvements.append("🎯 Clarify your content's purpose — inform, sell, or guide?")

        # Content length (general)
        word_count = parsed.get("word_count", 0)
        if content_type == "blog" and word_count < 300:
            improvements.append("📏 Blog posts should be 300+ words for better SEO performance")
        elif content_type == "article" and word_count < 500:
            improvements.append("📏 Articles should be 500+ words for comprehensive coverage")

        # If everything is good
        if not improvements:
            improvements.append("✅ Content is well-optimized! Minor tweaks may still improve ranking")

        return improvements[:10]  # Cap at 10 suggestions

    def _optimize_content(
        self,
        content: str,
        parsed: Dict,
        analysis: Dict,
        keywords: List[str],
    ) -> str:
        """
        Apply lightweight optimizations to the content.
        These are structural enhancements — not AI rewrites.
        """
        optimized = content

        # Ensure keyword appears in opening if missing
        if keywords and parsed.get("sentences"):
            first_sentence = parsed["sentences"][0] if parsed["sentences"] else ""
            kw = keywords[0]
            if kw.lower() not in first_sentence.lower() and kw.lower() not in optimized[:200].lower():
                # Prepend a hook sentence
                optimized = f"Discover everything about {kw} — {optimized}"

        # Add paragraph breaks if content is one long block
        if parsed.get("paragraph_count", 0) <= 1 and parsed.get("word_count", 0) > 80:
            sentences = parsed.get("sentences", [])
            if len(sentences) > 4:
                # Break into paragraph groups of 3-4 sentences
                groups = []
                for i in range(0, len(sentences), 3):
                    group = " ".join(sentences[i:i+3])
                    groups.append(group)
                optimized = "\n\n".join(groups)

        # Add a strong closing CTA if missing
        cq = analysis.get("content_quality", {})
        if "No clear CTA" in cq.get("details", ""):
            if not optimized.rstrip().endswith(("!", "?")):
                optimized = optimized.rstrip() + "\n\nTake the next step — apply these insights today!"

        return optimized

    def _generate_metadata(
        self, parsed: Dict, keywords: List[str], content_type: str
    ) -> Dict:
        """Generate optimized SEO metadata: title, meta description, hashtags."""
        text = parsed.get("clean_text", "")
        sentences = parsed.get("sentences", [])
        headings = parsed.get("headings", [])

        # Title: use first heading or craft from first sentence
        title = ""
        if headings:
            title = headings[0]
        elif sentences:
            # Take first sentence, trim to ~60 chars
            first = sentences[0]
            if len(first) > 60:
                title = first[:57] + "..."
            else:
                title = first

        # Add keyword to title if not present
        if keywords and title and keywords[0].lower() not in title.lower():
            kw = keywords[0].title()
            if len(title) + len(kw) + 3 <= 65:
                title = f"{kw}: {title}"
            else:
                title = f"{kw} — {title[:50]}..."

        # Meta description: craft from first 2 sentences (~155 chars)
        meta_desc = ""
        if sentences:
            combined = " ".join(sentences[:2])
            if len(combined) > 155:
                meta_desc = combined[:152] + "..."
            else:
                meta_desc = combined

        # Hashtags (for social content)
        hashtags = []
        if content_type == "social":
            # Convert keywords to hashtags
            for kw in keywords[:5]:
                tag = "#" + re.sub(r'\s+', '', kw.title())
                hashtags.append(tag)
            # Add some common engagement hashtags
            hashtags.extend(["#ContentStrategy", "#DigitalMarketing", "#Growth"])
            hashtags = list(dict.fromkeys(hashtags))[:8]  # Dedupe, max 8

        return {
            "title": title,
            "meta_description": meta_desc,
            "hashtags": hashtags,
        }

    def _suggest_additional_keywords(
        self, parsed: Dict, target_keywords: List[str], auto_keywords: List[str]
    ) -> List[str]:
        """Suggest additional keywords beyond what user provided."""
        suggestions = set()

        # Include auto-extracted keywords that aren't already in target
        target_lower = {k.lower() for k in target_keywords}
        for kw in auto_keywords:
            if kw.lower() not in target_lower:
                suggestions.add(kw)

        # Add related terms based on common SEO patterns
        text_lower = parsed.get("clean_text", "").lower()
        related_terms = {
            "marketing": ["digital marketing", "content marketing", "marketing strategy"],
            "seo": ["search engine optimization", "google ranking", "organic traffic"],
            "content": ["content strategy", "content creation", "blog writing"],
            "social": ["social media", "social strategy", "audience engagement"],
            "business": ["business growth", "startup", "entrepreneurship"],
            "technology": ["tech trends", "innovation", "digital transformation"],
        }

        for base, related in related_terms.items():
            if base in text_lower:
                for term in related:
                    if term not in text_lower:
                        suggestions.add(term)

        # Return combined, capped
        all_kw = list(target_keywords) + list(suggestions)
        return list(dict.fromkeys(all_kw))[:10]  # Dedupe, max 10


seo_optimizer = SEOOptimizer()
