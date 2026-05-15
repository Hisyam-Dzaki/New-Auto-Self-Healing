from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Dict

class BaseLLMProvider(ABC):
    @abstractmethod
    async def stream_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str
    ) -> str:
        pass
