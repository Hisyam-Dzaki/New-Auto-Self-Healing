from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
import time
import uuid

from ..models.database import get_db, Project, HealingRecord

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
    """Get Docker container statistics (every container on the host, not just this system's own)"""
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

class ReceiveLogRequest(BaseModel):
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    logs: str
    source: str = "external"
    metadata: Optional[Dict[str, Any]] = None

def _serialize_record(r: HealingRecord) -> dict:
    return {
        "task_id": r.task_id,
        "project_id": str(r.project_id) if r.project_id else None,
        "project_name": r.project_name,
        "classification": r.classification,
        "source": r.source,
        "status": r.status,
        "result": r.result,
        "handled_by_agent_id": str(r.handled_by_agent_id) if r.handled_by_agent_id else None,
        "timestamp": r.created_at.timestamp() if r.created_at else None,
    }

@router.post("/heal/receive")
async def receive_external_logs(request: ReceiveLogRequest, db: AsyncSession = Depends(get_db)):
    """Receive logs from external sources (VPS, worker containers, webhooks, etc.)"""
    from ..worker.log_analyzer import LogAnalyzer
    from ..worker.redis_queue import RedisQueue

    task_id = f"heal_{int(time.time())}_{hash(request.logs) % 10000}"

    project_id = request.project_id
    project_name = request.project_name

    if not project_id and project_name:
        result = await db.execute(select(Project).where(Project.name.ilike(project_name)))
        project = result.scalar_one_or_none()
        if project:
            project_id = str(project.id)

    if not project_id:
        raise HTTPException(status_code=400, detail="Project not found. Please specify project_id or project_name")

    queue = RedisQueue()

    analyzer = LogAnalyzer()
    classification = analyzer.classify(request.logs)
    context = analyzer.extract_error_context(request.logs)

    task = {
        "type": "heal_project",
        "task_id": task_id,
        "project_id": project_id,
        "project_name": project_name or "Unknown",
        "logs": request.logs,
        "classification": classification,
        "error_context": context,
        "source": request.source,
        "metadata": request.metadata,
        "triggered_at": time.time(),
        "status": "pending"
    }

    queue.push_task(task)

    record = HealingRecord(
        task_id=task_id,
        project_id=uuid.UUID(project_id),
        project_name=project_name,
        classification=classification,
        source=request.source,
        status="queued",
    )
    db.add(record)
    await db.commit()

    return {
        "task_id": task_id,
        "status": "queued",
        "classification": classification,
        "message": f"Healing task queued for project: {project_name or project_id}"
    }

@router.get("/heal/history")
async def get_healing_history(limit: int = 50, agent_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Get healing history, optionally filtered to the company-sim agent that handled it
    (e.g. the Office view's Ops Engine agent detail panel)."""
    query = select(HealingRecord)

    if agent_id:
        try:
            query = query.where(HealingRecord.handled_by_agent_id == uuid.UUID(agent_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid agent_id")

    result = await db.execute(query.order_by(HealingRecord.created_at.desc()).limit(limit))
    records = result.scalars().all()
    return {
        "history": [_serialize_record(r) for r in records],
        "total": len(records)
    }

@router.get("/heal/history/{task_id}")
async def get_healing_task_detail(task_id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed healing task information"""
    result = await db.execute(select(HealingRecord).where(HealingRecord.task_id == task_id))
    record = result.scalar_one_or_none()
    if record:
        return _serialize_record(record)

    from ..worker.redis_queue import RedisQueue
    queue = RedisQueue()
    state = queue.get_state(f"task:{task_id}")

    if state:
        return state

    raise HTTPException(status_code=404, detail="Task not found")

@router.post("/heal/manual/{project_id}")
async def trigger_manual_healing(project_id: str, logs: str, db: AsyncSession = Depends(get_db)):
    """Manually trigger healing for a project with logs"""
    from ..worker.log_analyzer import LogAnalyzer
    from ..worker.redis_queue import RedisQueue

    task_id = f"manual_{int(time.time())}"

    analyzer = LogAnalyzer()
    classification = analyzer.classify(logs)
    context = analyzer.extract_error_context(logs)

    queue = RedisQueue()

    task = {
        "type": "heal_project",
        "task_id": task_id,
        "project_id": project_id,
        "logs": logs,
        "classification": classification,
        "error_context": context,
        "source": "manual",
        "triggered_at": time.time(),
        "status": "pending"
    }

    queue.push_task(task)

    record = HealingRecord(
        task_id=task_id,
        project_id=uuid.UUID(project_id),
        classification=classification,
        source="manual",
        status="queued",
    )
    db.add(record)
    await db.commit()

    return {
        "task_id": task_id,
        "status": "queued",
        "classification": classification
    }
