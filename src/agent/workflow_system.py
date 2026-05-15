from typing import Dict, Any
from pydantic import BaseModel

class WorkflowConfig(BaseModel):
    planning: Dict[str, str]
    coding: Dict[str, str]
    summarization: Dict[str, str]

class WorkflowSystem:
    def __init__(self):
        self.workflows = {
            "build-app": {
                "planning": {"provider": "anthropic", "model": "claude-opus"},
                "coding": {"provider": "deepseek", "model": "deepseek-coder"},
                "summarization": {"provider": "openai", "model": "gpt-4"}
            },
            "fix-bug": {
                "planning": {"provider": "openai", "model": "gpt-4"},
                "coding": {"provider": "anthropic", "model": "claude-sonnet"},
                "summarization": {"provider": "openai", "model": "gpt-3.5-turbo"}
            },
            "refactor": {
                "planning": {"provider": "anthropic", "model": "claude-opus"},
                "coding": {"provider": "openai", "model": "gpt-4"},
                "summarization": {"provider": "openai", "model": "gpt-3.5-turbo"}
            },
            "analyze-logs": {
                "planning": {"provider": "google", "model": "gemini-pro"},
                "coding": {"provider": "anthropic", "model": "claude-sonnet"},
                "summarization": {"provider": "openai", "model": "gpt-3.5-turbo"}
            }
        }

    def get_workflow(self, name: str) -> Dict[str, Any]:
        return self.workflows.get(name, self.workflows["build-app"])

    def add_workflow(self, name: str, config: Dict[str, Any]):
        self.workflows[name] = config

    def list_workflows(self):
        return list(self.workflows.keys())
