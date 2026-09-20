from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from ..models.database import get_db, Worker, Project

router = APIRouter()

class WorkerRegister(BaseModel):
    name: str
    worker_type: Optional[str] = "generic"
    project_id: Optional[str] = None
    heartbeat_interval_seconds: int = 60
    metadata: Optional[Dict[str, Any]] = None

class HeartbeatPayload(BaseModel):
    status: Optional[str] = "healthy"
    metadata: Optional[Dict[str, Any]] = None

def _health_from_heartbeat(w: Worker) -> str:
    """Derive live health from last_heartbeat_at vs the worker's declared interval.
    A worker is 'late' past 2x its interval, 'dead' past 5x — gives it room for jitter
    before the monitor loop escalates (see src/worker/worker.py _check_worker_heartbeats)."""
    if not w.last_heartbeat_at:
        return "unknown"
    last = w.last_heartbeat_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - last).total_seconds()
    interval = w.heartbeat_interval_seconds or 60
    if elapsed > interval * 5:
        return "dead"
    if elapsed > interval * 2:
        return "late"
    return "healthy"

def _serialize(w: Worker) -> dict:
    return {
        "id": str(w.id),
        "name": w.name,
        "worker_type": w.worker_type,
        "project_id": str(w.project_id) if w.project_id else None,
        "heartbeat_interval_seconds": w.heartbeat_interval_seconds,
        "last_heartbeat_at": w.last_heartbeat_at.isoformat() if w.last_heartbeat_at else None,
        "status": w.status,
        "health": _health_from_heartbeat(w),
        "metadata": w.metadata_json,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }

@router.post("/workers/register")
async def register_worker(payload: WorkerRegister, db: AsyncSession = Depends(get_db)):
    """Register an external worker/agent container (content engine, trading bot, market scanner, etc.)
    so the orchestrator can track its heartbeat and health."""
    project_uuid = None
    if payload.project_id:
        try:
            project_uuid = uuid.UUID(payload.project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project_id")
        result = await db.execute(select(Project).where(Project.id == project_uuid))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Project not found")

    worker = Worker(
        name=payload.name,
        worker_type=payload.worker_type,
        project_id=project_uuid,
        heartbeat_interval_seconds=payload.heartbeat_interval_seconds,
        status="unknown",
        metadata_json=payload.metadata,
    )
    db.add(worker)
    await db.commit()
    await db.refresh(worker)

    return _serialize(worker)

@router.post("/workers/{worker_id}/heartbeat")
async def heartbeat(worker_id: str, payload: HeartbeatPayload, db: AsyncSession = Depends(get_db)):
    """Called periodically by a registered worker to report it's alive."""
    try:
        wid = uuid.UUID(worker_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Worker not found")

    result = await db.execute(select(Worker).where(Worker.id == wid))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker.last_heartbeat_at = datetime.now(timezone.utc)
    worker.status = payload.status or "healthy"
    if payload.metadata is not None:
        worker.metadata_json = payload.metadata

    await db.commit()
    await db.refresh(worker)

    return _serialize(worker)

@router.get("/workers")
async def list_workers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Worker).order_by(Worker.created_at.desc()))
    workers_list = result.scalars().all()
    return {"workers": [_serialize(w) for w in workers_list]}

@router.get("/workers/{worker_id}")
async def get_worker(worker_id: str, db: AsyncSession = Depends(get_db)):
    try:
        wid = uuid.UUID(worker_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Worker not found")

    result = await db.execute(select(Worker).where(Worker.id == wid))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    return _serialize(worker)

@router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str, db: AsyncSession = Depends(get_db)):
    try:
        wid = uuid.UUID(worker_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Worker not found")

    result = await db.execute(select(Worker).where(Worker.id == wid))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    await db.delete(worker)
    await db.commit()
    return {"status": "deleted"}
