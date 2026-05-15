from typing import AsyncGenerator, List, Dict
from .base import BaseLLMProvider
import httpx
import os

class OpenRouterProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1"
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://agentforge.local",
                "X-Title": "AgentForge"
            }
        )

    async def stream_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ):
        async with self.client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "stream": True
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    import json
                    try:
                        data = json.loads(line[6:])
                        if "choices" in data and len(data["choices"]) > 0:
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                    except:
                        pass

    async def completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> str:
        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": model,
                "messages": messages
            }
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def list_models(self) -> List[Dict]:
        response = await self.client.get(f"{self.base_url}/models")
        data = response.json()
        return data.get("data", [])

    async def get_model_info(self, model: str) -> Dict:
        response = await self.client.get(f"{self.base_url}/models/{model}")
        return response.json()

class NineRouterProvider(OpenRouterProvider):
    """9Router - Indonesian LLM Provider (Compatible with OpenRouter API)"""
    
    DEFAULT_BASE_URL = "https://router.9router.com/api/v1"
    
    def __init__(self, api_key: str, base_url: str = None):
        self.api_key = api_key
        self.base_url = base_url or os.getenv("NINEROUTER_BASE_URL", self.DEFAULT_BASE_URL)
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://agentforge.local",
                "X-Title": "AgentForge"
            }
        )

    async def stream_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ):
        async with self.client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "stream": True
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    import json
                    try:
                        data = json.loads(line[6:])
                        if "choices" in data and len(data["choices"]) > 0:
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                    except:
                        pass

    async def completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> str:
        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": model,
                "messages": messages
            }
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def list_models(self) -> List[Dict]:
        response = await self.client.get(f"{self.base_url}/models")
        data = response.json()
        return data.get("data", [])