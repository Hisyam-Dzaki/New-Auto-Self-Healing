from typing import AsyncGenerator, List, Dict
from .base import BaseLLMProvider
import anthropic

class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def stream_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> AsyncGenerator[str, None]:
        async with self.client.messages.stream(
            model=model,
            messages=messages,
            max_tokens=4096
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> str:
        response = await self.client.messages.create(
            model=model,
            messages=messages,
            max_tokens=4096
        )
        return response.content[0].text
