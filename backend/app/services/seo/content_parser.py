"""
Content Parser Service
Cleans, normalizes, and structures content for SEO analysis.
"""

import re
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class ContentParser:
    """Parses and normalizes raw content into structured components."""

    def parse(self, raw_content: str) -> Dict:
        """
        Parse raw content into structured components.
        Returns dict with cleaned text, sentences, paragraphs, word_count, headings.
        """
        # Strip any remaining HTML tags
        text = self._strip_html(raw_content)

        # Normalize whitespace
        text = self._normalize_whitespace(text)

        # Split into structural components
        paragraphs = self._split_paragraphs(text)
        sentences = self._split_sentences(text)
        words = self._extract_words(text)
        headings = self._detect_headings(raw_content)

        return {
            "clean_text": text,
            "paragraphs": paragraphs,
            "sentences": sentences,
            "words": words,
            "word_count": len(words),
            "sentence_count": len(sentences),
            "paragraph_count": len(paragraphs),
            "headings": headings,
        }

    def _strip_html(self, text: str) -> str:
        """Remove all HTML tags from text."""
        return re.sub(r"<[^>]+>", " ", text)

    def _normalize_whitespace(self, text: str) -> str:
        """Normalize whitespace: collapse multiple spaces, trim lines."""
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs by double newlines."""
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        return paragraphs

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitter using regex
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 3]

    def _extract_words(self, text: str) -> List[str]:
        """Extract individual words, lowercased."""
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        return words

    def _detect_headings(self, raw_text: str) -> List[str]:
        """
        Detect heading-like lines in content.
        Matches markdown headings (# Title) and lines that appear to be titles
        (short, capitalized, no ending punctuation).
        """
        headings = []
        lines = raw_text.split("\n")

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Markdown-style headings
            md_match = re.match(r'^(#{1,3})\s+(.+)$', line)
            if md_match:
                headings.append(md_match.group(2).strip())
                continue

            # Lines that look like [H1], [H2], [H3] prefixed (from URL extraction)
            h_match = re.match(r'^\[H[1-3]\]\s+(.+)$', line)
            if h_match:
                headings.append(h_match.group(1).strip())
                continue

        return headings


content_parser = ContentParser()
