from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import time

router = APIRouter()

class HealTaskRequest(BaseModel):
    service: str
    logs: str
    issue_type: Optional[str] = None
    severity: Optional[str] = None

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict] = None

@router.post("/heal/trigger")
async def trigger_healing(request: HealTaskRequest):
    """Manually trigger self-healing for a service"""
    from ..worker.redis_queue import RedisQueue
    
    queue = RedisQueue()
    
    task = {
        "type": "heal",
        "service": request.service,
        "logs": request.logs,
        "issue_type": request.issue_type,
        "severity": request.severity,
        "triggered_at": time.time(),
        "manual": True
    }
    
    task_id = queue.push_task(task)
    
    return {
        "task_id": task_id,
        "status": "queued",
        "message": f"Healing task queued for service: {request.service}"
    }

@router.get("/heal/status/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a healing task"""
    from ..worker.redis_queue import RedisQueue
    
    queue = RedisQueue()
    
    state = queue.get_state(f"task:{task_id}")
    
    if not state:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return state

@router.get("/worker/status")
async def get_worker_status():
    """Get current worker status"""
    from ..worker.redis_queue import RedisQueue
    
    queue = RedisQueue()
    
    worker_state = queue.get_state("worker")
    
    if not worker_state:
        return {
            "status": "offline",
            "message": "Worker is not running"
        }
    
    return worker_state

@router.get("/monitor/resources")
async def get_resource_metrics():
    """Get current resource metrics"""
    from ..worker.resource_monitor import ResourceMonitor
    
    monitor = ResourceMonitor()
    metrics = monitor.get_metrics()
    health = monitor.check_health()
    
    return {
        "metrics": {
            "cpu": metrics.cpu_percent,
            "memory": metrics.memory_percent,
            "disk": metrics.disk_percent,
            "memory_used_mb": metrics.memory_used_mb,
            "disk_used_gb": metrics.disk_used_gb
        },
        "health": health,
        "timestamp": metrics.timestamp
    }

@router.get("/monitor/docker")
async def get_docker_stats():
    """Get Docker container statistics"""
    from ..worker.resource_monitor import ResourceMonitor
    
    monitor = ResourceMonitor()
    stats = monitor.get_docker_stats()
    
    return stats

@router.get("/queue/status")
async def get_queue_status():
    """Get status of all queues"""
    from ..worker.redis_queue import RedisQueue
    
    queue = RedisQueue()
    
    return {
        "queues": queue.get_all_queue_sizes(),
        "health": queue.health_check()
    }

@router.get("/queue/deadletter")
async def get_deadletter_tasks():
    """Get tasks in deadletter queue"""
    from ..worker.redis_queue import RedisQueue
    
    queue = RedisQueue()
    tasks = queue.peek_deadletter(limit=20)
    
    return {
        "tasks": tasks,
        "count": len(tasks)
    }

@router.post("/queue/clear/{queue_name}")
async def clear_queue(queue_name: str):
    """Clear a specific queue"""
    from ..worker.redis_queue import RedisQueue, QueueType
    
    queue = RedisQueue()
    
    queue_map = {
        "incoming": QueueType.INCOMING,
        "processing": QueueType.PROCESSING,
        "retry": QueueType.RETRY,
        "deadletter": QueueType.DEADLETTER
    }
    
    queue_type = queue_map.get(queue_name)
    
    if not queue_type:
        raise HTTPException(status_code=400, detail="Invalid queue name")
    
    queue.clear_queue(queue_type)
    
    return {
        "status": "cleared",
        "queue": queue_name
    }

@router.post("/analyze/logs")
async def analyze_logs(logs: str):
    """Analyze logs and classify issues"""
    from ..worker.log_analyzer import LogAnalyzer
    
    analyzer = LogAnalyzer()
    
    classification = analyzer.classify(logs)
    filtered = analyzer.filter_logs(logs)
    context = analyzer.extract_error_context(logs)
    
    return {
        "classification": classification,
        "filtered_logs": filtered,
        "error_context": context
    }