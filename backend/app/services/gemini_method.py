    async def generate_content_gemini(
        self,
        topic: str,
        tone: Literal["professional", "casual", "friendly", "formal"],
        platform: Literal["linkedin", "twitter", "instagram", "facebook"],
        api_key: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate content using Google Gemini
        
        Args:
            topic: Content topic
            tone: Content tone
            platform: Target platform
            api_key: Gemini API key (optional, uses configured key if not provided)
            
        Returns:
            Dictionary with content, hashtags, and cta
        """
        try:
            # Configure API key if provided
            if api_key:
                genai.configure(api_key=api_key)
            
            # Use Gemini 1.5 Flash model (fast and free)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = self._build_prompt(topic, tone, platform)
            
            # Generate content
            response = model.generate_content(prompt)
            content_text = response.text
            
            # Parse JSON response
            import json
            try:
                parsed = json.loads(content_text)
                return {
                    "content": parsed.get("content", content_text),
                    "hashtags": parsed.get("hashtags", ""),
                    "cta": parsed.get("cta", "")
                }
            except json.JSONDecodeError:
                # Fallback if not valid JSON
                return {
                    "content": content_text,
                    "hashtags": "",
                    "cta": ""
                }
                
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            raise
