from typing import Dict, Any, List, Optional

class RecoveryManager:
    def __init__(self):
        self.max_retries = 3
        self.retry_count: Dict[str, int] = {}

    async def handle_failure(
        self,
        task_id: str,
        error: str,
        context: Dict
    ) -> Dict[str, Any]:
        self.retry_count[task_id] = self.retry_count.get(task_id, 0) + 1
        
        if self.retry_count[task_id] > self.max_retries:
            return {
                "status": "failed",
                "error": error,
                "retries": self.retry_count[task_id],
                "message": "Max retries exceeded"
            }
        
        recovery_plan = await self._create_recovery_plan(task_id, error, context)
        
        return {
            "status": "retrying",
            "recovery_plan": recovery_plan,
            "retries": self.retry_count[task_id]
        }

    async def _create_recovery_plan(
        self,
        task_id: str,
        error: str,
        context: Dict
    ) -> List[Dict]:
        plan = []
        
        if "build" in error.lower() or "compile" in error.lower():
            plan.append({"action": "analyze_error", "tool": "file_tools"})
            plan.append({"action": "fix_dependencies", "tool": "shell"})
            plan.append({"action": "retry_build", "tool": "docker"})
        
        elif "runtime" in error.lower() or "exception" in error.lower():
            plan.append({"action": "read_logs", "tool": "logs"})
            plan.append({"action": "inspect_stack", "tool": "file_tools"})
            plan.append({"action": "generate_patch", "tool": "llm"})
            plan.append({"action": "apply_patch", "tool": "file_tools"})
            plan.append({"action": "restart_service", "tool": "docker"})
        
        elif "docker" in error.lower():
            plan.append({"action": "cleanup_container", "tool": "docker"})
            plan.append({"action": "rebuild_image", "tool": "docker"})
            plan.append({"action": "restart_container", "tool": "docker"})
        
        else:
            plan.append({"action": "retry", "tool": "llm"})
        
        return plan

    def reset_retries(self, task_id: str):
        if task_id in self.retry_count:
            del self.retry_count[task_id]


class ExecutionManager:
    def __init__(self):
        self.active_executions: Dict[str, Dict] = {}
        self.recovery = RecoveryManager()
    
    async def execute_task(
        self,
        task_id: str,
        task: Dict,
        tools: List[Any]
    ) -> Dict:
        self.active_executions[task_id] = {
            "status": "running",
            "task": task,
            "started_at": None
        }
        
        try:
            for step in task.get("steps", []):
                result = await self._execute_step(step, tools)
                
                if result.get("status") == "error":
                    recovery_result = await self.recovery.handle_failure(
                        task_id,
                        result.get("error", "Unknown error"),
                        {"step": step, "result": result}
                    )
                    
                    if recovery_result["status"] == "failed":
                        return recovery_result
                    
                    for recovery_step in recovery_result.get("recovery_plan", []):
                        await self._execute_step(recovery_step, tools)
                
                self.active_executions[task_id]["current_step"] = step
            
            return {
                "status": "completed",
                "task_id": task_id
            }
            
        except Exception as e:
            return await self.recovery.handle_failure(task_id, str(e), {})
        finally:
            if task_id in self.active_executions:
                del self.active_executions[task_id]
    
    async def _execute_step(self, step: Dict, tools: List[Any]) -> Dict:
        tool_name = step.get("tool")
        action = step.get("action")
        
        for tool in tools:
            if hasattr(tool, "name") and tool.name == tool_name:
                return await tool.execute({"action": action, **step})
        
        return {"status": "error", "error": f"Tool {tool_name} not found"}
    
    def get_execution_status(self, task_id: str) -> Optional[Dict]:
        return self.active_executions.get(task_id)