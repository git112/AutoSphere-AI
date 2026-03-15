"""
Image Generation Service
Handles image asset creation with fallback logic.
1. Gemini Image (Imagen)
2. HuggingFace API
3. Ollama local fallback
"""

import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class ImageService:
    """Service to generate image assets with fallback mechanisms"""
    
    def __init__(self):
        self.hf_api_key = os.getenv("HUGGINGFACE_API_KEY")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.hf_model = "stabilityai/stable-diffusion-2-1"

    async def generate_image(self, prompt: str, style: str) -> Optional[str]:
        """Entry point for image generation with fallback logic"""
        full_prompt = f"{prompt}, {style} style, high quality, 4k"
        
        # 1. Try Gemini (Placeholder logic as real Imagen access often requires GCP/Vertex)
        result = await self._try_gemini_image(full_prompt)
        if result: return result
        
        # 2. Try HuggingFace
        result = await self._try_hf_image(full_prompt)
        if result: return result
        
        # 3. Try Ollama local fallback
        result = await self._try_ollama_image(full_prompt)
        if result: return result
        
        logger.warning("All image generation methods failed")
        return None

    async def _try_gemini_image(self, prompt: str) -> Optional[str]:
        """Placeholder for Gemini Imagen integration"""
        # Note: Standard google-generativeai SDK doesn't always support Imagen out-of-the-box
        # without specific cloud project setup.
        logger.info("Skipping Gemini image generation (requires specific setup)")
        return None

    async def _try_hf_image(self, prompt: str) -> Optional[str]:
        """Generate image using HuggingFace Inference API"""
        if not self.hf_api_key:
            logger.info("HuggingFace API key not found, skipping")
            return None
            
        try:
            api_url = f"https://api-inference.huggingface.co/models/{self.hf_model}"
            headers = {"Authorization": f"Bearer {self.hf_api_key}"}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(api_url, headers=headers, json={"inputs": prompt})
                if response.status_code == 200:
                    import uuid
                    import os
                    
                    # Create directory if not exists
                    save_dir = r"d:\AutoSphere-AI\client\public\generated_images"
                    os.makedirs(save_dir, exist_ok=True)
                    
                    filename = f"{uuid.uuid4().hex}.png"
                    filepath = os.path.join(save_dir, filename)
                    
                    with open(filepath, "wb") as f:
                        f.write(response.content)
                        
                    logger.info("HuggingFace image generation successful")
                    return f"/generated_images/{filename}"
                else:
                    logger.warning(f"HuggingFace raw response: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"HuggingFace generation failed: {e}")
        return None

    async def _try_ollama_image(self, prompt: str) -> Optional[str]:
        """Generate image using Ollama (if a diffusion model is hosted there)"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Custom endpoint or specific model name if supported locally
                response = await client.post(
                    f"{self.ollama_base_url}/api/generate",
                    json={"model": "stable-diffusion", "prompt": prompt}
                )
                if response.status_code == 200:
                    logger.info("Ollama image generation successful")
                    return "/local-assets/generated-image.png"
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
        return None

# Singleton instance
image_service = ImageService()
