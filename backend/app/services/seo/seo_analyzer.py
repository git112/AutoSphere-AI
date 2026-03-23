"""
SEO Analyzer Service
Performs 5-dimension SEO analysis using rule-based + lightweight NLP logic.
"""

import re
import math
import logging
from typing import Dict, List
from collections import Counter

logger = logging.getLogger(__name__)


# ── Word lists for analysis ───────────────────────────────────────────────────

POWER_WORDS = {
    "exclusive", "proven", "ultimate", "essential", "powerful", "incredible",
    "revolutionary", "breakthrough", "guaranteed", "secret", "amazing",
    "stunning", "remarkable", "extraordinary", "brilliant", "transform",
    "boost", "skyrocket", "dominate", "unleash", "discover", "unlock",
    "master", "instantly", "effortless", "free", "new", "best", "top",
    "critical", "urgent", "limited", "insider", "hack", "strategy",
}

CTA_PHRASES = {
    "click here", "learn more", "get started", "sign up", "subscribe",
    "download", "try now", "buy now", "contact us", "read more",
    "share this", "comment below", "tell us", "join us", "follow",
    "link in bio", "check out", "don't miss", "grab your", "claim",
}

TRANSITION_WORDS = {
    "however", "furthermore", "moreover", "therefore", "consequently",
    "additionally", "nevertheless", "meanwhile", "alternatively", "similarly",
    "likewise", "accordingly", "hence", "thus", "indeed", "specifically",
    "for example", "in contrast", "on the other hand", "as a result",
    "in addition", "first", "second", "third", "finally", "next",
}

STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "and", "but", "or",
    "nor", "not", "so", "yet", "for", "at", "by", "to", "in", "on",
    "of", "with", "from", "up", "about", "into", "over", "after",
    "it", "its", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "my", "your", "his", "her", "our", "their",
}


class SEOAnalyzer:
    """Analyzes content across 5 SEO dimensions."""

    def analyze(self, parsed: Dict, target_keywords: List[str], content_type: str) -> Dict:
        """
        Run full SEO analysis. Returns dimension scores and details.
        
        Args:
            parsed: Output from ContentParser.parse()
            target_keywords: User-specified target keywords
            content_type: blog, social, or article
        
        Returns:
            Dict with keyword_score, content_quality, structure_score,
            readability_score, intent_match scores and details.
        """
        text = parsed["clean_text"]
        words = parsed["words"]
        sentences = parsed["sentences"]
        paragraphs = parsed["paragraphs"]
        headings = parsed["headings"]
        word_count = parsed["word_count"]

        # Auto-extract keywords if none provided
        if not target_keywords:
            target_keywords = self._auto_extract_keywords(words)

        keyword_result = self._analyze_keywords(text, words, target_keywords, headings)
        quality_result = self._analyze_content_quality(text, words, sentences, paragraphs)
        structure_result = self._analyze_structure(paragraphs, headings, word_count, content_type)
        readability_result = self._analyze_readability(words, sentences)
        intent_result = self._analyze_intent(text, words, content_type)

        return {
            "keyword_score": keyword_result,
            "content_quality": quality_result,
            "structure_score": structure_result,
            "readability_score": readability_result,
            "intent_match": intent_result,
            "auto_keywords": target_keywords,
        }

    # ── Dimension 1: Keyword Relevance ────────────────────────────────────────

    def _analyze_keywords(
        self, text: str, words: List[str], keywords: List[str], headings: List[str]
    ) -> Dict:
        """Analyze keyword density, placement, and distribution."""
        if not keywords or not words:
            return {"score": 30, "details": "No keywords to analyze"}

        text_lower = text.lower()
        total_words = len(words)
        score = 0
        findings = []

        for kw in keywords:
            kw_lower = kw.lower()
            count = text_lower.count(kw_lower)
            density = (count / max(total_words, 1)) * 100

            # Keyword presence (up to 15 pts per keyword, max 3 keywords scored)
            if count > 0:
                score += 10

            # Ideal density: 1-3%
            if 0.5 <= density <= 3.0:
                score += 10
                findings.append(f"'{kw}' density {density:.1f}% — optimal range")
            elif density > 3.0:
                findings.append(f"'{kw}' density {density:.1f}% — over-optimized, reduce usage")
            elif count > 0:
                findings.append(f"'{kw}' density {density:.1f}% — could use more mentions")

            # Keyword in headings bonus
            for h in headings:
                if kw_lower in h.lower():
                    score += 5
                    findings.append(f"'{kw}' appears in heading — great for SEO")
                    break

            # Keyword in first 100 words
            first_100 = " ".join(words[:100])
            if kw_lower in first_100:
                score += 5
                findings.append(f"'{kw}' found in opening — strong placement")

        # Normalize to 0-100
        max_possible = len(keywords[:3]) * 30
        score = min(100, int((score / max(max_possible, 1)) * 100))

        details = "; ".join(findings[:5]) if findings else "Keywords not found in content"
        return {"score": score, "details": details}

    # ── Dimension 2: Content Quality ──────────────────────────────────────────

    def _analyze_content_quality(
        self, text: str, words: List[str], sentences: List[str], paragraphs: List[str]
    ) -> Dict:
        """Analyze engagement quality: power words, CTAs, questions, hooks."""
        score = 0
        findings = []
        text_lower = text.lower()

        # Power words (target: 2-5% of total)
        power_count = sum(1 for w in words if w in POWER_WORDS)
        power_pct = (power_count / max(len(words), 1)) * 100
        if power_pct >= 1.5:
            score += 25
            findings.append(f"{power_count} power words found — engaging content")
        elif power_count > 0:
            score += 15
            findings.append(f"Only {power_count} power words — add more engaging language")
        else:
            findings.append("No power words found — content may lack engagement")

        # Questions (engage readers)
        question_count = text.count("?")
        if question_count >= 2:
            score += 20
            findings.append(f"{question_count} questions — good for engagement")
        elif question_count == 1:
            score += 10
            findings.append("1 question found — consider adding more for engagement")
        else:
            findings.append("No questions — adding questions improves engagement")

        # CTAs
        cta_found = sum(1 for phrase in CTA_PHRASES if phrase in text_lower)
        if cta_found >= 1:
            score += 20
            findings.append(f"{cta_found} call-to-action found — drives conversions")
        else:
            findings.append("No clear CTA — add a call-to-action")

        # Transition words (flow)
        transition_count = sum(1 for w in TRANSITION_WORDS if w in text_lower)
        if transition_count >= 3:
            score += 15
        elif transition_count >= 1:
            score += 8

        # Content length bonus
        word_count = len(words)
        if word_count >= 300:
            score += 20
            findings.append(f"{word_count} words — good content depth")
        elif word_count >= 100:
            score += 10
            findings.append(f"{word_count} words — could be more comprehensive")
        else:
            findings.append(f"Only {word_count} words — too short for SEO impact")

        score = min(100, score)
        return {"score": score, "details": "; ".join(findings[:5])}

    # ── Dimension 3: Content Structure ────────────────────────────────────────

    def _analyze_structure(
        self, paragraphs: List[str], headings: List[str], word_count: int, content_type: str
    ) -> Dict:
        """Analyze content structure: headings, paragraphs, formatting."""
        score = 0
        findings = []

        # Heading presence and count
        if len(headings) >= 3:
            score += 30
            findings.append(f"{len(headings)} headings — well-structured")
        elif len(headings) >= 1:
            score += 15
            findings.append(f"Only {len(headings)} heading(s) — add more sub-headings")
        else:
            if content_type != "social":
                findings.append("No headings found — critical for structure and SEO")

        # Paragraph structure
        if len(paragraphs) >= 3:
            score += 20
            findings.append(f"{len(paragraphs)} paragraphs — good readability")
        elif len(paragraphs) >= 2:
            score += 10
        else:
            if word_count > 50:
                findings.append("Content is one long block — break into paragraphs")

        # Paragraph length (ideal: 40-150 words)
        long_paragraphs = sum(1 for p in paragraphs if len(p.split()) > 150)
        if long_paragraphs == 0 and len(paragraphs) > 0:
            score += 20
        elif long_paragraphs > 0:
            findings.append(f"{long_paragraphs} paragraph(s) too long — split for readability")

        # Lists detection (markdown bullet points)
        has_lists = any(line.strip().startswith(("-", "*", "•", "1.")) for p in paragraphs for line in p.split("\n"))
        if has_lists:
            score += 15
            findings.append("Lists detected — improves scannability")

        # Social content bonus (shorter structure is okay)
        if content_type == "social":
            score += 15

        score = min(100, score)
        return {"score": score, "details": "; ".join(findings[:5])}

    # ── Dimension 4: Readability ──────────────────────────────────────────────

    def _analyze_readability(self, words: List[str], sentences: List[str]) -> Dict:
        """Analyze readability using simplified Flesch-Kincaid heuristics."""
        if not words or not sentences:
            return {"score": 50, "details": "Insufficient content for readability analysis"}

        score = 0
        findings = []

        # Average sentence length (ideal: 15-20 words)
        avg_sentence_len = len(words) / max(len(sentences), 1)
        if 10 <= avg_sentence_len <= 20:
            score += 35
            findings.append(f"Avg sentence length: {avg_sentence_len:.0f} words — ideal")
        elif avg_sentence_len < 10:
            score += 20
            findings.append(f"Avg sentence length: {avg_sentence_len:.0f} words — sentences too short")
        else:
            score += 10
            findings.append(f"Avg sentence length: {avg_sentence_len:.0f} words — shorten for clarity")

        # Average word length (complexity proxy)
        avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
        if avg_word_len <= 5.0:
            score += 30
            findings.append("Simple vocabulary — easy to read")
        elif avg_word_len <= 6.5:
            score += 20
            findings.append("Moderate vocabulary complexity")
        else:
            score += 5
            findings.append("Complex vocabulary — simplify where possible")

        # Sentence variety (mix of short and long sentences)
        if len(sentences) >= 3:
            lengths = [len(s.split()) for s in sentences]
            variance = sum((l - avg_sentence_len) ** 2 for l in lengths) / len(lengths)
            std_dev = math.sqrt(variance)
            if std_dev >= 4:
                score += 20
                findings.append("Good sentence variety — keeps readers engaged")
            else:
                score += 10
                findings.append("Little sentence variety — vary lengths for flow")

        # Passive voice detection (simplified)
        passive_indicators = ["is ", "are ", "was ", "were ", "been ", "being "]
        passive_count = sum(1 for s in sentences if any(ind in s.lower() for ind in passive_indicators) and "by " in s.lower())
        active_ratio = 1 - (passive_count / max(len(sentences), 1))
        if active_ratio >= 0.8:
            score += 15
        elif active_ratio >= 0.6:
            score += 8
            findings.append("Some passive voice detected — prefer active voice")

        score = min(100, score)
        return {"score": score, "details": "; ".join(findings[:5])}

    # ── Dimension 5: Search Intent Alignment ─────────────────────────────────

    def _analyze_intent(self, text: str, words: List[str], content_type: str) -> Dict:
        """Analyze how well content aligns with likely search intent."""
        score = 0
        findings = []
        text_lower = text.lower()

        # Informational signals
        info_signals = ["how to", "what is", "guide", "tutorial", "tips", "learn", "understand", "explained", "overview"]
        info_count = sum(1 for s in info_signals if s in text_lower)

        # Transactional signals
        trans_signals = ["buy", "price", "deal", "discount", "offer", "purchase", "order", "shop", "subscribe"]
        trans_count = sum(1 for s in trans_signals if s in text_lower)

        # Navigational signals
        nav_signals = ["official", "website", "homepage", "login", "sign in", "download", "app"]
        nav_count = sum(1 for s in nav_signals if s in text_lower)

        # Determine dominant intent
        intents = {
            "informational": info_count,
            "transactional": trans_count,
            "navigational": nav_count,
        }
        dominant = max(intents, key=intents.get)
        dominant_score = intents[dominant]

        if dominant_score >= 3:
            score += 40
            findings.append(f"Clear {dominant} intent — well-focused content")
        elif dominant_score >= 1:
            score += 25
            findings.append(f"Partially {dominant} intent — could be more focused")
        else:
            score += 10
            findings.append("Unclear search intent — define a clear purpose")

        # Content type alignment
        if content_type == "blog" and dominant == "informational":
            score += 25
            findings.append("Blog format matches informational intent — great alignment")
        elif content_type == "social":
            score += 20  # Social has flexible intent
        elif content_type == "article" and dominant == "informational":
            score += 25

        # Supporting evidence: does content answer questions?
        has_answers = any(w in text_lower for w in ["because", "therefore", "the reason", "this means", "in conclusion"])
        if has_answers:
            score += 15
            findings.append("Content provides explanations — satisfies user intent")

        # Meta signals
        has_structure_for_intent = len(words) >= 100
        if has_structure_for_intent:
            score += 10

        score = min(100, score)
        return {"score": score, "details": "; ".join(findings[:5])}

    # ── Auto-extract keywords ────────────────────────────────────────────────

    def _auto_extract_keywords(self, words: List[str], top_n: int = 5) -> List[str]:
        """Extract likely keywords from content using frequency analysis."""
        # Filter stop words and short words
        meaningful = [w for w in words if w not in STOP_WORDS and len(w) >= 4]
        counter = Counter(meaningful)
        return [word for word, _ in counter.most_common(top_n)]


seo_analyzer = SEOAnalyzer()
