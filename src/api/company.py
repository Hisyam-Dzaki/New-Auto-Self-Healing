from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
import uuid

from ..agents.base import DepartmentType, AgentStatus, AgentBehavior
from ..models.database import get_db, Department, CompanyAgent, CompanyTask, HealingRecord

router = APIRouter(prefix="/company", tags=["company"])


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Rough, documented estimate only — no real per-provider cost tracking is wired yet
# (see ANALYSIS.md §1.5 on the unused Execution.estimated_cost column). Good enough to
# make the Budget page show real, derived numbers instead of a 404.
ESTIMATED_COST_PER_1K_TOKENS = Decimal("0.01")


class AddAgentRequest(BaseModel):
    name: str
    role: str
    department: DepartmentType
    skills: Optional[List[str]] = None
    hourly_rate: Optional[float] = 0
    monthly_budget: Optional[float] = 0


class MoveAgentRequest(BaseModel):
    new_department: DepartmentType


class CreateTaskRequest(BaseModel):
    title: str
    description: str = ""
    department: DepartmentType
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_to: Optional[str] = None


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    assigned_to: Optional[str] = None


class UpdateAgentStatusRequest(BaseModel):
    status: AgentStatus
    behavior: Optional[AgentBehavior] = None


class UpdateAgentRequest(BaseModel):
    role: Optional[str] = None
    skills: Optional[List[str]] = None
    behavior: Optional[str] = None


class UpdateBudgetRequest(BaseModel):
    monthly_budget: float


async def _get_department_by_type(db: AsyncSession, dept_type: str) -> Optional[Department]:
    result = await db.execute(select(Department).where(Department.type == dept_type))
    return result.scalar_one_or_none()


async def _get_agent_or_404(db: AsyncSession, agent_id: str) -> CompanyAgent:
    try:
        aid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Agent not found")
    result = await db.execute(select(CompanyAgent).where(CompanyAgent.id == aid))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


def _serialize_agent(a: CompanyAgent, department_type: Optional[str] = None) -> dict:
    return {
        "id": str(a.id),
        "name": a.name,
        "role": a.role,
        "department": department_type,
        "status": a.status,
        "behavior": a.behavior,
        "skills": a.skills or [],
        "is_system_agent": a.is_system_agent,
        "tasks_completed": a.tasks_completed,
        "tasks_failed": a.tasks_failed,
        "tokens_used": a.tokens_used,
        "hourly_rate": float(a.hourly_rate) if a.hourly_rate is not None else 0,
        "monthly_budget": float(a.monthly_budget) if a.monthly_budget is not None else 0,
        "last_active": a.last_active.isoformat() if a.last_active else None,
    }


def _serialize_department(d: Department) -> dict:
    return {
        "id": str(d.id),
        "name": d.name,
        "type": d.type,
        "description": d.description,
        "agent_count": None,  # filled in by callers that eager-load agents
        "active_tasks": d.active_tasks,
        "completed_tasks": d.completed_tasks,
    }


@router.get("/stats")
async def get_company_stats(db: AsyncSession = Depends(get_db)):
    dept_result = await db.execute(select(Department))
    departments = dept_result.scalars().all()

    agent_result = await db.execute(select(CompanyAgent))
    agents = agent_result.scalars().all()

    agents_by_dept: dict = {}
    for a in agents:
        agents_by_dept.setdefault(str(a.department_id), []).append(a)

    total_tokens = sum(a.tokens_used for a in agents)
    total_active = sum(d.active_tasks for d in departments)
    total_completed = sum(d.completed_tasks for d in departments)

    return {
        "company_name": "AgentForge Inc.",
        "total_departments": len(departments),
        "total_agents": len(agents),
        "active_tasks": total_active,
        "completed_tasks": total_completed,
        "total_tokens": total_tokens,
        "departments": [
            {
                "id": str(d.id),
                "name": d.name,
                "type": d.type,
                "agent_count": len(agents_by_dept.get(str(d.id), [])),
                "active_tasks": d.active_tasks,
                "completed_tasks": d.completed_tasks,
            }
            for d in departments
        ],
    }


@router.get("/departments")
async def get_departments(db: AsyncSession = Depends(get_db)):
    dept_result = await db.execute(select(Department))
    departments = dept_result.scalars().all()

    agent_result = await db.execute(select(CompanyAgent))
    agents = agent_result.scalars().all()
    counts: dict = {}
    for a in agents:
        counts[str(a.department_id)] = counts.get(str(a.department_id), 0) + 1

    return {
        "departments": [
            {**_serialize_department(d), "agent_count": counts.get(str(d.id), 0)}
            for d in departments
        ]
    }


@router.get("/departments/{dept_type}")
async def get_department(dept_type: DepartmentType, db: AsyncSession = Depends(get_db)):
    dept = await _get_department_by_type(db, dept_type.value)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    agent_result = await db.execute(select(CompanyAgent).where(CompanyAgent.department_id == dept.id))
    agents = agent_result.scalars().all()

    return {
        **_serialize_department(dept),
        "agent_count": len(agents),
        "agents": [_serialize_agent(a, dept_type.value) for a in agents],
    }


@router.get("/agents")
async def get_all_agents(db: AsyncSession = Depends(get_db)):
    dept_result = await db.execute(select(Department))
    dept_by_id = {d.id: d.type for d in dept_result.scalars().all()}

    agent_result = await db.execute(select(CompanyAgent))
    agents = agent_result.scalars().all()

    return {
        "agents": [_serialize_agent(a, dept_by_id.get(a.department_id)) for a in agents]
    }


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await _get_agent_or_404(db, agent_id)
    dept_result = await db.execute(select(Department).where(Department.id == agent.department_id))
    dept = dept_result.scalar_one_or_none()
    return _serialize_agent(agent, dept.type if dept else None)


@router.post("/agents")
async def add_agent(request: AddAgentRequest, db: AsyncSession = Depends(get_db)):
    dept = await _get_department_by_type(db, request.department.value)
    if not dept:
        raise HTTPException(status_code=400, detail="Department not found")

    agent = CompanyAgent(
        department_id=dept.id,
        name=request.name,
        role=request.role,
        skills=request.skills or [],
        hourly_rate=request.hourly_rate or 0,
        monthly_budget=request.monthly_budget or 0,
        status="idle",
        behavior="idle",
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return _serialize_agent(agent, dept.type)


@router.delete("/agents/{agent_id}")
async def remove_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await _get_agent_or_404(db, agent_id)
    if agent.is_system_agent:
        raise HTTPException(status_code=400, detail="Cannot remove the system Ops Engine agent")
    await db.delete(agent)
    await db.commit()
    return {"message": "Agent removed successfully"}


@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest, db: AsyncSession = Depends(get_db)):
    agent = await _get_agent_or_404(db, agent_id)

    if request.role:
        agent.role = request.role
    if request.skills:
        agent.skills = request.skills
    if request.behavior and request.behavior in [b.value for b in AgentBehavior]:
        agent.behavior = request.behavior

    await db.commit()
    await db.refresh(agent)
    dept_result = await db.execute(select(Department).where(Department.id == agent.department_id))
    dept = dept_result.scalar_one_or_none()
    return _serialize_agent(agent, dept.type if dept else None)


@router.put("/agents/{agent_id}/move")
async def move_agent(agent_id: str, request: MoveAgentRequest, db: AsyncSession = Depends(get_db)):
    agent = await _get_agent_or_404(db, agent_id)
    if agent.is_system_agent:
        raise HTTPException(status_code=400, detail="Cannot move the system Ops Engine agent")

    dept = await _get_department_by_type(db, request.new_department.value)
    if not dept:
        raise HTTPException(status_code=400, detail="Department not found")

    agent.department_id = dept.id
    await db.commit()
    return {"message": "Agent moved successfully"}


@router.put("/agents/{agent_id}/status")
async def update_agent_status(agent_id: str, request: UpdateAgentStatusRequest, db: AsyncSession = Depends(get_db)):
    agent = await _get_agent_or_404(db, agent_id)
    agent.status = request.status.value
    if request.behavior:
        agent.behavior = request.behavior.value
    agent.last_active = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Status updated successfully"}


@router.get("/budgets")
async def get_budgets(db: AsyncSession = Depends(get_db)):
    """Real, DB-derived numbers (hourly_rate/monthly_budget/tokens_used all live on
    CompanyAgent) — not fabricated. 'spent' is estimated from tokens_used until real
    per-call cost tracking is wired (see ANALYSIS.md §1.5 / §5.4)."""
    dept_result = await db.execute(select(Department))
    dept_by_id = {d.id: d.type for d in dept_result.scalars().all()}

    agent_result = await db.execute(select(CompanyAgent))
    agents = agent_result.scalars().all()

    budgets = []
    for a in agents:
        spent = (Decimal(a.tokens_used) / Decimal(1000)) * ESTIMATED_COST_PER_1K_TOKENS
        monthly_budget = a.monthly_budget or Decimal(0)
        budgets.append({
            "agent_id": str(a.id),
            "agent_name": a.name,
            "department": dept_by_id.get(a.department_id),
            "hourly_rate": float(a.hourly_rate or 0),
            "monthly_budget": float(monthly_budget),
            "spent": float(spent),
            "remaining": float(monthly_budget - spent),
        })

    return {"budgets": budgets}


@router.put("/budgets/{agent_id}")
async def update_budget(agent_id: str, request: UpdateBudgetRequest, db: AsyncSession = Depends(get_db)):
    agent = await _get_agent_or_404(db, agent_id)
    agent.monthly_budget = request.monthly_budget
    await db.commit()
    return {"message": "Budget updated successfully"}


@router.post("/tasks")
async def create_task(request: CreateTaskRequest, db: AsyncSession = Depends(get_db)):
    dept = await _get_department_by_type(db, request.department.value)
    if not dept:
        raise HTTPException(status_code=400, detail="Department not found")

    assigned_to_uuid = None
    if request.assigned_to:
        try:
            assigned_to_uuid = uuid.UUID(request.assigned_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid assigned_to id")

    task = CompanyTask(
        title=request.title,
        description=request.description,
        department_id=dept.id,
        priority=request.priority.value,
        assigned_to=assigned_to_uuid,
        status="pending",
    )
    db.add(task)
    dept.active_tasks = (dept.active_tasks or 0) + 1
    await db.commit()
    await db.refresh(task)
    return _serialize_task(task, dept.type)


def _serialize_task(t: CompanyTask, department_type: Optional[str] = None) -> dict:
    return {
        "id": str(t.id),
        "title": t.title,
        "description": t.description,
        "department": department_type,
        "assigned_to": str(t.assigned_to) if t.assigned_to else None,
        "priority": t.priority,
        "status": t.status,
        "started_at": t.started_at.isoformat() if t.started_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "result": t.result,
        "error": t.error,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@router.get("/tasks")
async def get_tasks(
    department: Optional[DepartmentType] = None,
    status: Optional[TaskStatus] = None,
    db: AsyncSession = Depends(get_db)
):
    dept_result = await db.execute(select(Department))
    dept_by_id = {d.id: d.type for d in dept_result.scalars().all()}

    query = select(CompanyTask)
    if department:
        dept = await _get_department_by_type(db, department.value)
        if dept:
            query = query.where(CompanyTask.department_id == dept.id)
    if status:
        query = query.where(CompanyTask.status == status.value)

    result = await db.execute(query.order_by(CompanyTask.created_at.desc()))
    tasks = result.scalars().all()

    return {
        "tasks": [_serialize_task(t, dept_by_id.get(t.department_id)) for t in tasks],
        "stats": await _task_stats(db),
    }


async def _task_stats(db: AsyncSession) -> dict:
    result = await db.execute(select(CompanyTask))
    tasks = result.scalars().all()

    dept_result = await db.execute(select(Department))
    departments = dept_result.scalars().all()

    by_department = {}
    for d in departments:
        dept_tasks = [t for t in tasks if t.department_id == d.id]
        by_department[d.type] = {
            "total": len(dept_tasks),
            "pending": len([t for t in dept_tasks if t.status == "pending"]),
            "processing": len([t for t in dept_tasks if t.status == "processing"]),
            "completed": len([t for t in dept_tasks if t.status == "completed"]),
        }

    return {
        "total": len(tasks),
        "pending": len([t for t in tasks if t.status == "pending"]),
        "processing": len([t for t in tasks if t.status == "processing"]),
        "completed": len([t for t in tasks if t.status == "completed"]),
        "failed": len([t for t in tasks if t.status == "failed"]),
        "by_department": by_department,
    }


@router.get("/tasks/stats")
async def get_task_stats(db: AsyncSession = Depends(get_db)):
    return await _task_stats(db)


@router.get("/tasks/pending")
async def get_pending_tasks(department: Optional[DepartmentType] = None, db: AsyncSession = Depends(get_db)):
    dept_result = await db.execute(select(Department))
    dept_by_id = {d.id: d.type for d in dept_result.scalars().all()}

    query = select(CompanyTask).where(CompanyTask.status == "pending")
    if department:
        dept = await _get_department_by_type(db, department.value)
        if dept:
            query = query.where(CompanyTask.department_id == dept.id)

    result = await db.execute(query)
    tasks = result.scalars().all()
    return {"tasks": [_serialize_task(t, dept_by_id.get(t.department_id)) for t in tasks]}


async def _get_task_or_404(db: AsyncSession, task_id: str) -> CompanyTask:
    try:
        tid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Task not found")
    result = await db.execute(select(CompanyTask).where(CompanyTask.id == tid))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/tasks/{task_id}")
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(db, task_id)
    dept_result = await db.execute(select(Department).where(Department.id == task.department_id))
    dept = dept_result.scalar_one_or_none()
    return _serialize_task(task, dept.type if dept else None)


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, request: UpdateTaskRequest, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(db, task_id)
    update_data = request.model_dump(exclude_none=True)
    for key, value in update_data.items():
        if key == "assigned_to" and value:
            value = uuid.UUID(value)
        elif key == "priority" and hasattr(value, "value"):
            value = value.value
        setattr(task, key, value)
    await db.commit()
    dept_result = await db.execute(select(Department).where(Department.id == task.department_id))
    dept = dept_result.scalar_one_or_none()
    return _serialize_task(task, dept.type if dept else None)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(db, task_id)
    await db.delete(task)
    await db.commit()
    return {"message": "Task deleted successfully"}


@router.post("/tasks/{task_id}/start")
async def start_task(task_id: str, agent_id: str, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(db, task_id)
    if task.status != "pending":
        raise HTTPException(status_code=400, detail="Task cannot be started")

    agent = await _get_agent_or_404(db, agent_id)

    task.status = "processing"
    task.assigned_to = agent.id
    task.started_at = datetime.now(timezone.utc)

    agent.status = "working"
    agent.behavior = "working"
    agent.last_active = datetime.now(timezone.utc)

    await db.commit()
    dept_result = await db.execute(select(Department).where(Department.id == task.department_id))
    dept = dept_result.scalar_one_or_none()
    return _serialize_task(task, dept.type if dept else None)


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, result: Optional[str] = None, error: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(db, task_id)
    task.completed_at = datetime.now(timezone.utc)
    if error:
        task.status = "failed"
        task.error = error
    else:
        task.status = "completed"
        task.result = result

    if task.assigned_to:
        agent_result = await db.execute(select(CompanyAgent).where(CompanyAgent.id == task.assigned_to))
        agent = agent_result.scalar_one_or_none()
        if agent:
            if error:
                agent.tasks_failed += 1
                agent.status = "error"
                agent.behavior = "error"
            else:
                agent.tasks_completed += 1
                agent.status = "success"
                agent.behavior = "success"
            agent.last_active = datetime.now(timezone.utc)

    await db.commit()
    dept_result = await db.execute(select(Department).where(Department.id == task.department_id))
    dept = dept_result.scalar_one_or_none()
    return _serialize_task(task, dept.type if dept else None)
