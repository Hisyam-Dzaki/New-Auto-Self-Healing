from typing import List, Dict
from .base import BaseLLMProvider
import httpx

class OllamaProvider(BaseLLMProvider):
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        # local models can take 10s+ to cold-load into memory on first call;
        # httpx's 5s default timeout was killing every first request.
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))

    async def stream_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ):
        async with self.client.stream(
            "POST",
            f"{self.base_url}/api/chat",
            json={"model": model, "messages": messages, "stream": True}
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    import json
                    data = json.loads(line)
                    if "message" in data and "content" in data["message"]:
                        yield data["message"]["content"]

    async def completion(
        self,
        messages: List[Dict[str, str]],
        model: str
    ) -> str:
        response = await self.client.post(
            f"{self.base_url}/api/chat",
            json={"model": model, "messages": messages, "stream": False}
        )
        data = response.json()

        if "message" not in data:
            error = data.get("error", response.text)
            raise RuntimeError(f"Ollama error (model={model}): {error}")

        return data["message"]["content"]