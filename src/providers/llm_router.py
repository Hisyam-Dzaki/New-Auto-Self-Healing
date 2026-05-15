from typing import Dict, List, Optional
from .base import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .gemini_provider import GeminiProvider
from .deepseek_provider import DeepSeekProvider
from .ollama_provider import OllamaProvider
from .openrouter_provider import OpenRouterProvider, NineRouterProvider
from .groq_provider import GroqProvider
from .lmstudio_provider import LMStudioProvider

class LLMRouter:
    def __init__(self):
        self.providers: Dict[str, BaseLLMProvider] = {}
        self.model_mappings: Dict[str, str] = {}
        self._load_providers()
        self._load_model_mappings()

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
            base_url = os.getenv("NINEROUTER_BASE_URL")
            self.providers["9router"] = NineRouterProvider(
                os.getenv("NINEROUTER_API_KEY"), 
                base_url=base_url
            )
        
        if os.getenv("GROQ_API_KEY"):
            self.providers["groq"] = GroqProvider(os.getenv("GROQ_API_KEY"))
        
        lm_studio_url = os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
        self.providers["lmstudio"] = LMStudioProvider(base_url=lm_studio_url)

    def _load_model_mappings(self):
        self.model_mappings = {
            "gpt-4": "openai",
            "gpt-4-turbo": "openai",
            "gpt-3.5-turbo": "openai",
            "claude-3-opus": "anthropic",
            "claude-3-sonnet": "anthropic",
            "claude-3-haiku": "anthropic",
            "claude-3.5-sonnet": "anthropic",
            "gemini-pro": "gemini",
            "gemini-1.5-pro": "gemini",
            "deepseek-coder": "deepseek",
            "deepseek-chat": "deepseek",
            "llama-3.3-70b-versatile": "groq",
            "llama-3.1-8b-instant": "groq",
            "mixtral-8x7b-32768": "groq",
            "gemma2-9b-it": "groq",
        }

    def get_provider(self, model: str) -> Optional[BaseLLMProvider]:
        model_lower = model.lower() if model else ""
        
        if model_lower.startswith("gpt"):
            return self.providers.get("openai")
        elif model_lower.startswith("claude"):
            return self.providers.get("anthropic")
        elif model_lower.startswith("gemini"):
            return self.providers.get("gemini")
        elif model_lower.startswith("deepseek"):
            return self.providers.get("deepseek")
        elif model_lower.startswith("llama") or model_lower.startswith("mixtral") or model_lower.startswith("gemma"):
            if "groq" in self.providers:
                return self.providers.get("groq")
            return self.providers.get("openrouter") or self.providers.get("9router")
        elif model_lower.startswith("ollama/"):
            return self.providers.get("ollama")
        elif "/" in model:
            return self.providers.get("openrouter") or self.providers.get("9router")
        else:
            mapped_provider = self.model_mappings.get(model)
            if mapped_provider:
                return self.providers.get(mapped_provider)
            return self.providers.get("9router") or self.providers.get("openai")

    def add_provider(self, name: str, provider: BaseLLMProvider):
        self.providers[name] = provider
    
    def add_model_mapping(self, model: str, provider: str):
        self.model_mappings[model] = provider
    
    def list_providers(self) -> List[str]:
        return list(self.providers.keys())
    
    def list_available_models(self) -> Dict[str, List[str]]:
        models = {}
        for name, provider in self.providers.items():
            if hasattr(provider, "list_models"):
                try:
                    models[name] = provider.list_models()
                except:
                    models[name] = []
            else:
                models[name] = []
        return models
    
    def get_provider_by_name(self, name: str) -> Optional[BaseLLMProvider]:
        return self.providers.get(name)