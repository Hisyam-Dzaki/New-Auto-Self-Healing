from typing import Dict
from .base import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider

class LLMRouter:
    def __init__(self):
        self.providers: Dict[str, BaseLLMProvider] = {}
        self._load_providers()

    def _load_providers(self):
        import os
        
        if os.getenv("OPENAI_API_KEY"):
            self.providers["openai"] = OpenAIProvider(os.getenv("OPENAI_API_KEY"))
        
        if os.getenv("ANTHROPIC_API_KEY"):
            self.providers["anthropic"] = AnthropicProvider(os.getenv("ANTHROPIC_API_KEY"))

    def get_provider(self, model: str) -> BaseLLMProvider:
        if model.startswith("gpt"):
            return self.providers.get("openai")
        elif model.startswith("claude"):
            return self.providers.get("anthropic")
        else:
            return self.providers.get("openai")

    def add_provider(self, name: str, provider: BaseLLMProvider):
        self.providers[name] = provider
