from typing import Dict, Any, List
from .base import BaseTool
import os
import glob

class LogsTool(BaseTool):
    name = "logs"
    description = "Read and analyze logs from projects and containers"
    
    async def execute(self, input: Dict[str, Any]) -> Any:
        action = input.get("action")
        
        if action == "read":
            return await self._read_logs(input)
        elif action == "search":
            return await self._search_logs(input)
        elif action == "analyze":
            return await self._analyze_logs(input)
        elif action == "tail":
            return await self._tail_logs(input)
        elif action == "container":
            return await self._read_container_logs(input)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _read_logs(self, input: Dict) -> Dict:
        log_path = input.get("path")
        limit = input.get("limit", 100)
        
        if not os.path.exists(log_path):
            return {"error": "Log file not found"}
        
        with open(log_path, "r") as f:
            lines = f.readlines()
        
        return {
            "logs": lines[-limit:],
            "total_lines": len(lines),
            "path": log_path
        }
    
    async def _search_logs(self, input: Dict) -> Dict:
        log_path = input.get("path")
        pattern = input.get("pattern")
        
        if not os.path.exists(log_path):
            return {"error": "Log file not found"}
        
        matches = []
        with open(log_path, "r") as f:
            for i, line in enumerate(f, 1):
                if pattern.lower() in line.lower():
                    matches.append({
                        "line_number": i,
                        "content": line.strip()
                    })
        
        return {
            "matches": matches,
            "count": len(matches),
            "pattern": pattern
        }
    
    async def _analyze_logs(self, input: Dict) -> Dict:
        log_path = input.get("path")
        
        if not os.path.exists(log_path):
            return {"error": "Log file not found"}
        
        error_count = 0
        warning_count = 0
        info_count = 0
        errors = []
        
        with open(log_path, "r") as f:
            for line in f:
                line_lower = line.lower()
                if "error" in line_lower or "exception" in line_lower or "traceback" in line_lower:
                    error_count += 1
                    errors.append(line.strip())
                elif "warning" in line_lower or "warn" in line_lower:
                    warning_count += 1
                elif "info" in line_lower:
                    info_count += 1
        
        return {
            "error_count": error_count,
            "warning_count": warning_count,
            "info_count": info_count,
            "errors": errors[-10:],
            "analysis": "High error count indicates application issues"
        }
    
    async def _tail_logs(self, input: Dict) -> Dict:
        log_path = input.get("path")
        lines = input.get("lines", 50)
        
        if not os.path.exists(log_path):
            return {"error": "Log file not found"}
        
        with open(log_path, "r") as f:
            all_lines = f.readlines()
        
        return {
            "logs": all_lines[-lines:],
            "path": log_path
        }
    
    async def _read_container_logs(self, input: Dict) -> Dict:
        import docker
        
        container_name = input.get("container_name")
        tail = input.get("tail", 100)
        
        client = docker.from_env()
        
        try:
            container = client.containers.get(container_name)
            logs = container.logs(tail=tail).decode("utf-8")
            
            return {
                "logs": logs.split("\n"),
                "container": container_name
            }
        except docker.errors.NotFound:
            return {"error": f"Container {container_name} not found"}