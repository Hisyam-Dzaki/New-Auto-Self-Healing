from typing import AsyncGenerator, Optional
import json

class AgentCore:
    def __init__(
        self,
        model: Optional[str] = None,
        workflow: Optional[str] = None,
        project_id: Optional[str] = None
    ):
        self.model = model or "gpt-4"
        self.workflow = workflow
        self.project_id = project_id
        self.context = []
        
    async def process_prompt(self, message: str) -> AsyncGenerator[str, None]:
        self.context.append({"role": "user", "content": message})
        
        from ..providers.llm_router import LLMRouter
        
        router = LLMRouter()
        provider = router.get_provider(self.model)
        
        async for chunk in provider.stream_completion(
            messages=self.context,
            model=self.model
        ):
            yield chunk
            
        self.context.append({"role": "assistant", "content": chunk})
