from typing import List, Dict, Optional
from .base import BaseLLMProvider
import os

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self.client = genai

    async def stream_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ):
        model_instance = self.client.GenerativeModel(model)
        
        prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        
        response = model_instance.generate_content(prompt, stream=True)
        
        for chunk in response:
            if chunk.text:
                yield chunk.text

    async def completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> str:
        model_instance = self.client.GenerativeModel(model)
        
        prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        
        response = model_instance.generate_content(prompt)
        return response.text