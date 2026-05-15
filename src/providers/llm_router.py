from typing import Dict
from .base import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .gemini_provider import GeminiProvider
from .deepseek_provider import DeepSeekProvider
from .ollama_provider import OllamaProvider
from .openrouter_provider import OpenRouterProvider, NineRouterProvider

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
        
        if os.getenv("GOOGLE_API_KEY"):
            self.providers["gemini"] = GeminiProvider(os.getenv("GOOGLE_API_KEY"))
        
        if os.getenv("DEEPSEEK_API_KEY"):
            self.providers["deepseek"] = DeepSeekProvider(os.getenv("DEEPSEEK_API_KEY"))
        
        if os.getenv("OLLAMA_BASE_URL"):
            self.providers["ollama"] = OllamaProvider(os.getenv("OLLAMA_BASE_URL"))
        else:
            self.providers["ollama"] = OllamaProvider()
        
        if os.getenv("OPENROUTER_API_KEY"):
            self.providers["openrouter"] = OpenRouterProvider(os.getenv("OPENROUTER_API_KEY"))
        
        if os.getenv("NINEROUTER_API_KEY"):
            self.providers["9router"] = NineRouterProvider(os.getenv("NINEROUTER_API_KEY"))

    def get_provider(self, model: str) -> BaseLLMProvider:
        if model.startswith("gpt"):
            return self.providers.get("openai")
        elif model.startswith("claude"):
            return self.providers.get("anthropic")
        elif model.startswith("gemini"):
            return self.providers.get("gemini")
        elif model.startswith("deepseek"):
            return self.providers.get("deepseek")
        elif model.startswith("ollama/") or model in ["llama", "mistral", "codellama"]:
            return self.providers.get("ollama")
        elif "/" in model:
            return self.providers.get("openrouter") or self.providers.get("9router")
        else:
            return self.providers.get("openai")

    def add_provider(self, name: str, provider: BaseLLMProvider):
        self.providers[name] = provider
    
    def list_providers(self):
        return list(self.providers.keys())
