from typing import Dict, Any
from .base import BaseTool
import subprocess

class GitTool(BaseTool):
    name = "git"
    description = "Execute git operations"
    
    async def execute(self, input: Dict[str, Any]) -> Any:
        operation = input.get("operation")
        path = input.get("path", ".")
        
        if operation == "status":
            return await self._git_status(path)
        elif operation == "log":
            return await self._git_log(path)
        elif operation == "diff":
            return await self._git_diff(path)
        elif operation == "commit":
            return await self._git_commit(path, input.get("message", ""))
        else:
            return {"error": "Unknown git operation"}
    
    async def _git_status(self, path: str) -> Dict:
        result = subprocess.run(
            ["git", "status"],
            cwd=path,
            capture_output=True,
            text=True
        )
        return {"output": result.stdout}
    
    async def _git_log(self, path: str, limit: int = 10) -> Dict:
        result = subprocess.run(
            ["git", "log", f"-{limit}", "--oneline"],
            cwd=path,
            capture_output=True,
            text=True
        )
        return {"output": result.stdout}
    
    async def _git_diff(self, path: str) -> Dict:
        result = subprocess.run(
            ["git", "diff"],
            cwd=path,
            capture_output=True,
            text=True
        )
        return {"output": result.stdout}
    
    async def _git_commit(self, path: str, message: str) -> Dict:
        result = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=path,
            capture_output=True,
            text=True
        )
        return {"output": result.stdout, "error": result.stderr}