from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseTool(ABC):
    name: str
    description: str
    
    @abstractmethod
    async def execute(self, input: Dict[str, Any]) -> Any:
        pass
    
    def to_schema(self) -> Dict:
        return {
            "name": self.name,
            "description": self.description
        }

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}
    
    def register(self, tool: BaseTool):
        self.tools[tool.name] = tool
    
    def get(self, name: str) -> BaseTool:
        return self.tools.get(name)
    
    def list_tools(self):
        return [tool.to_schema() for tool in self.tools.values()]