from typing import List, Dict, AsyncGenerator
from .base import BaseLLMProvider
import httpx

class LMStudioProvider(BaseLLMProvider):
    def __init__(self, base_url: str = "http://localhost:1234/v1"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            headers={"Content-Type": "application/json"}
        )

    async def stream_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> AsyncGenerator[str, None]:
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        async with self.client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json={
                "model": model or "local-model",
                "messages": formatted_messages,
                "stream": True
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    import json
                    try:
                        data = json.loads(line[6:])
                        if data.get("choices") and len(data["choices"]) > 0:
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                    except:
                        if line.strip() == "data: [DONE]":
                            break
                        pass

    async def completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> str:
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": model or "local-model",
                "messages": formatted_messages
            }
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def list_models(self) -> List[Dict]:
        try:
            response = await self.client.get(f"{self.base_url}/models")
            if response.status_code == 200:
                return response.json().get("data", [])
        except:
            pass
        return [{"id": "local-model", "name": "Local Model (LM Studio)"}]

    async def get_model_status(self) -> Dict:
        try:
            response = await self.client.get(f"{self.base_url}/model")
            return response.json()
        except Exception as e:
            return {"status": "unavailable", "error": str(e)}