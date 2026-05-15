import re
from typing import Dict, List, Optional
from enum import Enum

class IssueType(str, Enum):
    CONTAINER_CRASH = "container_crash"
    API_TIMEOUT = "api_timeout"
    MEMORY_LEAK = "memory_leak"
    CPU_SPIKE = "cpu_spike"
    DISK_FULL = "disk_full"
    NGINX_ERROR = "nginx_error"
    FASTAPI_CRASH = "fastapi_crash"
    REDIS_UNAVAILABLE = "redis_unavailable"
    INVALID_ENV = "invalid_env"
    MISSING_DEPENDENCY = "missing_dependency"
    FAILED_DEPLOYMENT = "failed_deployment"
    BROKEN_CONFIG = "broken_config"
    HEALTH_CHECK_FAIL = "health_check_fail"
    INFINITE_RESTART = "infinite_restart"
    QUEUE_STUCK = "queue_stuck"
    WEBSOCKET_DISCONNECT = "websocket_disconnect"
    SSL_RENEWAL = "ssl_renewal"
    PROCESS_DEADLOCK = "process_deadlock"
    UNKNOWN = "unknown"

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class LogAnalyzer:
    def __init__(self):
        self.patterns = self._load_patterns()
    
    def _load_patterns(self) -> Dict:
        return {
            IssueType.CONTAINER_CRASH: [
                r"container.*exited",
                r"container.*died",
                r"OOMKilled",
                r"exit code [1-9]"
            ],
            IssueType.API_TIMEOUT: [
                r"timeout",
                r"timed out",
                r"request timeout",
                r"gateway timeout"
            ],
            IssueType.MEMORY_LEAK: [
                r"out of memory",
                r"OOM",
                r"memory.*exceeded",
                r"cannot allocate memory"
            ],
            IssueType.CPU_SPIKE: [
                r"cpu.*100%",
                r"high cpu",
                r"cpu throttling"
            ],
            IssueType.DISK_FULL: [
                r"no space left",
                r"disk full",
                r"quota exceeded"
            ],
            IssueType.FASTAPI_CRASH: [
                r"uvicorn.*error",
                r"fastapi.*exception",
                r"application startup failed"
            ],
            IssueType.REDIS_UNAVAILABLE: [
                r"redis.*connection refused",
                r"redis.*unavailable",
                r"could not connect to redis"
            ],
            IssueType.MISSING_DEPENDENCY: [
                r"ModuleNotFoundError",
                r"ImportError",
                r"cannot import",
                r"no module named"
            ],
            IssueType.BROKEN_CONFIG: [
                r"configuration error",
                r"invalid config",
                r"config.*not found"
            ],
            IssueType.HEALTH_CHECK_FAIL: [
                r"health check failed",
                r"healthcheck.*unhealthy",
                r"liveness probe failed"
            ]
        }
    
    def classify(self, logs: str) -> Dict:
        logs_lower = logs.lower()
        
        detected_issues = []
        for issue_type, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, logs_lower):
                    detected_issues.append(issue_type)
                    break
        
        if not detected_issues:
            detected_issues.append(IssueType.UNKNOWN)
        
        primary_issue = detected_issues[0]
        severity = self._determine_severity(primary_issue, logs_lower)
        
        return {
            "primary_issue": primary_issue.value,
            "all_issues": [i.value for i in detected_issues],
            "severity": severity.value,
            "summary": self._generate_summary(primary_issue, logs_lower)
        }
    
    def _determine_severity(self, issue: IssueType, logs: str) -> Severity:
        critical_keywords = ["critical", "fatal", "panic", "oomkilled"]
        high_keywords = ["error", "exception", "failed", "crash"]
        medium_keywords = ["warning", "timeout", "retry"]
        
        for keyword in critical_keywords:
            if keyword in logs:
                return Severity.CRITICAL
        
        if issue in [IssueType.CONTAINER_CRASH, IssueType.MEMORY_LEAK, IssueType.DISK_FULL]:
            return Severity.CRITICAL
        
        for keyword in high_keywords:
            if keyword in logs:
                return Severity.HIGH
        
        for keyword in medium_keywords:
            if keyword in logs:
                return Severity.MEDIUM
        
        return Severity.LOW
    
    def _generate_summary(self, issue: IssueType, logs: str) -> str:
        summaries = {
            IssueType.CONTAINER_CRASH: "Container has crashed or exited unexpectedly",
            IssueType.API_TIMEOUT: "API requests are timing out",
            IssueType.MEMORY_LEAK: "System is running out of memory",
            IssueType.CPU_SPIKE: "CPU usage is abnormally high",
            IssueType.DISK_FULL: "Disk space is full or nearly full",
            IssueType.FASTAPI_CRASH: "FastAPI application has crashed",
            IssueType.REDIS_UNAVAILABLE: "Redis connection is unavailable",
            IssueType.MISSING_DEPENDENCY: "Required dependency is missing",
            IssueType.BROKEN_CONFIG: "Configuration file is invalid or missing",
            IssueType.HEALTH_CHECK_FAIL: "Health check endpoint is failing"
        }
        return summaries.get(issue, "Unknown issue detected")
    
    def filter_logs(self, logs: str, max_lines: int = 100) -> str:
        lines = logs.split('\n')
        
        priority_keywords = [
            "error", "exception", "fatal", "critical", "failed",
            "timeout", "crash", "killed", "panic", "traceback"
        ]
        
        filtered = []
        for line in lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in priority_keywords):
                filtered.append(line)
        
        if not filtered:
            filtered = lines[-max_lines:]
        else:
            filtered = filtered[-max_lines:]
        
        return '\n'.join(filtered)
    
    def extract_error_context(self, logs: str) -> Dict:
        lines = logs.split('\n')
        
        errors = []
        tracebacks = []
        
        in_traceback = False
        current_traceback = []
        
        for line in lines:
            if 'traceback' in line.lower() or 'exception' in line.lower():
                in_traceback = True
                current_traceback = [line]
            elif in_traceback:
                if line.strip() and not line.startswith(' '):
                    tracebacks.append('\n'.join(current_traceback))
                    in_traceback = False
                    current_traceback = []
                else:
                    current_traceback.append(line)
            elif any(keyword in line.lower() for keyword in ['error', 'failed', 'exception']):
                errors.append(line.strip())
        
        if current_traceback:
            tracebacks.append('\n'.join(current_traceback))
        
        return {
            "errors": errors[-10:],
            "tracebacks": tracebacks[-3:],
            "error_count": len(errors)
        }