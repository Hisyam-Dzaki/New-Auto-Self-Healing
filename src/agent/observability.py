from pydantic import BaseModel
from typing import List, Optional
import time

class ExecutionLog(BaseModel):
    timestamp: float
    project_id: str
    tool_name: str
    input: str
    output: str
    latency: float
    token_usage: Optional[int] = None
    model_name: Optional[str] = None

class ObservabilitySystem:
    def __init__(self):
        self.logs: List[ExecutionLog] = []

    def log_execution(
        self,
        project_id: str,
        tool_name: str,
        input: str,
        output: str,
        latency: float,
        token_usage: Optional[int] = None,
        model_name: Optional[str] = None
    ):
        log = ExecutionLog(
            timestamp=time.time(),
            project_id=project_id,
            tool_name=tool_name,
            input=input,
            output=output,
            latency=latency,
            token_usage=token_usage,
            model_name=model_name
        )
        self.logs.append(log)
        return log

    def get_project_logs(self, project_id: str) -> List[ExecutionLog]:
        return [log for log in self.logs if log.project_id == project_id]

    def get_token_usage(self, project_id: Optional[str] = None) -> int:
        if project_id:
            return sum(log.token_usage or 0 for log in self.logs if log.project_id == project_id)
        return sum(log.token_usage or 0 for log in self.logs)

    def get_avg_latency(self, model_name: Optional[str] = None) -> float:
        relevant_logs = self.logs
        if model_name:
            relevant_logs = [log for log in self.logs if log.model_name == model_name]
        
        if not relevant_logs:
            return 0.0
        return sum(log.latency for log in relevant_logs) / len(relevant_logs)
