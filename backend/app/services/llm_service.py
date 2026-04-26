"""
LLM Service
Handles AI content generation using Gemini 1.5/2.0 Pro with BYOK support.
Enforces structured JSON output.
"""

import os
import json
import logging
import google.generativeai as genai
from typing import Dict, Optional, Literal

logger = logging.getLogger(__name__)

class LLMService:
    """Service to interact with Gemini for high-quality content generation"""
    
    def __init__(self):
        self.system_api_key = os.getenv("GEMINI_API_KEY")
        if self.system_api_key:
            genai.configure(api_key=self.system_api_key)
            
    def _get_model(self, model_name: str = 'gemini-2.5-flash', api_key: Optional[str] = None):
        """Initializes and returns the generative model"""
        if api_key:
            genai.configure(api_key=api_key)
        # Primary: 1.5 Flash (Higher quota), Fallback: gemini-pro
        return genai.GenerativeModel(model_name)

    def _build_composer_prompt(self, topic: str, platform: str, tone: str, goal: str) -> str:
        """Builds a structured prompt for the AI Content Composer"""
        
        platform_rules = ""
        if platform.lower() == "instagram":
            platform_rules = """
        EXTRA INSTAGRAM RULES:
        - Use a Gen Z friendly tone (casual, conversational slang is allowed)
        - Use emojis naturally
        - Include a strong hook in the first line
        - Keep paragraphs very short
        - End with an engaging question
        """

        return f"""
        You are a senior social media strategist. Generate a high-performing post for {platform}.
        
        Topic: {topic}
        Tone: {tone}
        Goal: {goal}
        Platform: {platform}
        {platform_rules}
        
        Requirements:
        1. Create a compelling caption suitable for {platform}.
        2. Provide exactly 5-10 hyper-relevant hashtags.
        3. Include a strong Call to Action (CTA).
        
        Return ONLY a JSON object with this exact structure:
        {{
            "caption": "Your generated caption here",
            "hashtags": "hashtag1 hashtag2 hashtag3",
            "cta": "Your CTA here"
        }}
        
        Response:
        """

    async def generate_post_content(
        self, 
        topic: str, 
        platform: str, 
        tone: str, 
        goal: str, 
        user_api_key: Optional[str] = None
    ) -> Dict:
        """Generates structured content with error handling and fallback"""
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        last_error = None

        for model_name in models_to_try:
            try:
                model = self._get_model(model_name, user_api_key or self.system_api_key)
                prompt = self._build_composer_prompt(topic, platform, tone, goal)
                
                response = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                
                # Clean response text
                content_text = response.text.strip()
                if content_text.startswith("```json"):
                    content_text = content_text.replace("```json", "").replace("```", "").strip()
                
                return json.loads(content_text)
                
            except Exception as e:
                last_error = e
                logger.warning(f"Generation with {model_name} failed: {e}. Trying next model...")
                # If it's an invalid key, don't retry with other models as they will likely fail too
                if "API_KEY_INVALID" in str(e):
                    raise ValueError("Invalid Gemini API Key")
                continue

        # If all models fail
        logger.error(f"All Gemini models failed: {last_error}")
        if "429" in str(last_error) or "quota" in str(last_error).lower():
            raise Exception("AI Quota exceeded. Please try again later or provide a custom API key.")
        raise Exception(f"Failed to generate content: {str(last_error)}")

# Singleton instance
llm_service = LLMService()
