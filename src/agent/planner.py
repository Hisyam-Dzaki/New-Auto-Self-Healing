from typing import Dict, List, Optional
from .workflow_system import WorkflowSystem

class AgentPlanner:
    def __init__(self):
        self.workflow_system = WorkflowSystem()
    
    async def plan(self, prompt: str, context: Dict) -> List[Dict]:
        tasks = []
        
        if "create" in prompt.lower() or "build" in prompt.lower():
            tasks.append({"type": "create_project", "description": "Create project structure"})
            tasks.append({"type": "generate_files", "description": "Generate initial files"})
            tasks.append({"type": "setup_docker", "description": "Setup Docker configuration"})
        
        elif "fix" in prompt.lower() or "debug" in prompt.lower():
            tasks.append({"type": "analyze_logs", "description": "Analyze error logs"})
            tasks.append({"type": "inspect_code", "description": "Inspect source code"})
            tasks.append({"type": "generate_patch", "description": "Generate fix"})
            tasks.append({"type": "run_tests", "description": "Run tests"})
        
        elif "refactor" in prompt.lower():
            tasks.append({"type": "analyze_code", "description": "Analyze code structure"})
            tasks.append({"type": "refactor", "description": "Refactor code"})
            tasks.append({"type": "validate", "description": "Validate changes"})
        
        else:
            tasks.append({"type": "general", "description": prompt})
        
        return tasks