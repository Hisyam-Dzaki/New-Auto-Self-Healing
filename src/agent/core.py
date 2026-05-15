from typing import Dict, List, Optional, AsyncGenerator
import asyncio

class AgentCore:
    def __init__(
        self,
        model: Optional[str] = None,
        workflow: Optional[str] = None,
        project_id: Optional[str] = None
    ):
        self.model = model or "anthropic/claude-3.5-sonnet"
        self.workflow = workflow
        self.project_id = project_id
        self.context = []
        
        self.planner = None
        self.memory = None
        self.validator = None
        self.router = None
        self.execution_manager = None
        self.skill_registry = None
        
        self._initialize_components()
    
    def _initialize_components(self):
        from .planner import AgentPlanner
        from .memory import MemoryManager
        from .validator import Validator
        from .execution_manager import ExecutionManager
        from .skills import SkillRegistry
        
        self.planner = AgentPlanner()
        self.memory = MemoryManager()
        self.validator = Validator()
        self.execution_manager = ExecutionManager()
        self.skill_registry = SkillRegistry()
        
        self._initialize_router()
    
    def _initialize_router(self):
        from ..providers.llm_router import LLMRouter
        self.router = LLMRouter()
        
        if self.workflow:
            from .workflow_system import WorkflowSystem
            wf_system = WorkflowSystem()
            wf_config = wf_system.get_workflow(self.workflow)
            
            if self.model in wf_config:
                provider_config = wf_config[self.model]
                if "provider" in provider_config:
                    pass
    
    async def process_prompt(self, message: str) -> AsyncGenerator[str, None]:
        self.context.append({"role": "user", "content": message})
        
        tasks = await self.planner.plan(message, {"context": self.context})
        
        for task in tasks:
            result = await self._execute_task_with_tools(task)
            
            if result.get("status") == "error":
                yield f"Error: {result.get('error')}\n"
                continue
            
            response = await self._generate_response(message, result)
            
            if isinstance(response, str):
                yield response
            else:
                async for chunk in response:
                    yield chunk
        
        self.memory.add_message("user", message)
        
        if hasattr(self, '_current_response'):
            self.memory.add_message("assistant", self._current_response)
    
    async def _execute_task_with_tools(self, task: Dict) -> Dict:
        from ..tools.base import ToolRegistry
        from ..tools.file_tools import FileTools
        from ..tools.shell_tool import ShellTool
        from ..tools.git_tool import GitTool
        from ..tools.project_tool import ProjectTool
        from ..tools.logs_tool import LogsTool
        from ..execution.docker_tool import DockerTool
        
        registry = ToolRegistry()
        
        registry.register(FileTools())
        registry.register(ShellTool())
        registry.register(GitTool())
        registry.register(ProjectTool())
        registry.register(LogsTool())
        registry.register(DockerTool())
        
        tool = registry.get(task.get("type", ""))
        
        if tool:
            return await tool.execute(task)
        
        return {"status": "no_tool_found", "task": task}
    
    async def _generate_response(self, message: str, context: Dict) -> AsyncGenerator[str, None]:
        provider = self.router.get_provider(self.model)
        
        if not provider:
            yield "Error: No provider available for model " + self.model
            return
        
        system_prompt = self._build_system_prompt(context)
        
        prompt_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
        
        try:
            async for chunk in provider.stream_completion(prompt_messages, self.model):
                yield chunk
                self._current_response = (self._current_response or "") + chunk
        except Exception as e:
            yield f"Error generating response: {str(e)}"
    
    def _build_system_prompt(self, context: Dict) -> str:
        prompt = """You are AgentForge, an autonomous AI agent platform.
        
You can help users with:
- Creating and managing projects
- Writing and editing code
- Debugging and fixing errors
- Deploying applications
- Running Docker containers
- Analyzing logs and code

Available tools: file read/write, docker, shell commands (whitelisted), git operations.

Always be helpful, precise, and follow security guidelines.
"""
        
        if self.project_id:
            prompt += f"\nCurrent project: {self.project_id}"
        
        if context:
            task_info = context.get("task", {})
            if task_info:
                prompt += f"\nCurrent task: {task_info.get('description', 'Unknown')}"
        
        return prompt
    
    async def execute_skill(self, skill_name: str, context: Dict) -> Dict:
        skill = self.skill_registry.get_skill(skill_name)
        
        if not skill:
            return {"error": f"Skill {skill_name} not found"}
        
        results = []
        for step in skill.steps:
            step_result = await self._execute_skill_step(step, skill, context)
            results.append(step_result)
            
            if step_result.get("status") == "error":
                return {"status": "failed", "step": step, "results": results}
        
        return {"status": "completed", "results": results}
    
    async def _execute_skill_step(self, step: str, skill: Skill, context: Dict) -> Dict:
        return {"step": step, "status": "executed"}
    
    def get_status(self) -> Dict:
        return {
            "model": self.model,
            "workflow": self.workflow,
            "project_id": self.project_id,
            "context_length": len(self.context),
            "available_providers": self.router.list_providers() if self.router else [],
            "available_skills": len(self.skill_registry.list_skills()) if self.skill_registry else 0
        }
    
    def reset_context(self):
        self.context = []
        if self.memory:
            self.memory.clear()