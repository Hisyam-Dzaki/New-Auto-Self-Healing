from typing import Dict, Any
from .base import BaseTool
import subprocess

class ShellTool(BaseTool):
    name = "shell"
    description = "Execute safe shell commands"
    
    ALLOWED_COMMANDS = ["git", "npm", "node", "python", "pip", "docker", "ls", "cat", "echo"]
    BLOCKED_PATTERNS = ["rm -rf /", "shutdown", "reboot", "mkfs", "dd if="]
    
    def _validate_command(self, command: str) -> bool:
        cmd_parts = command.split()
        if not cmd_parts:
            return False
        
        base_cmd = cmd_parts[0]
        if base_cmd not in self.ALLOWED_COMMANDS:
            return False
        
        for pattern in self.BLOCKED_PATTERNS:
            if pattern in command.lower():
                return False
        
        return True
    
    async def execute(self, input: Dict[str, Any]) -> Any:
        command = input.get("command", "")
        
        if not self._validate_command(command):
            return {"error": "Command not allowed", "command": command}
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"error": "Command timeout"}
        except Exception as e:
            return {"error": str(e)}