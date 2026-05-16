from fastapi import APIRouter, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from ..agents.base import DepartmentType, AgentStatus, AgentBehavior
from ..company.manager import company_manager
from ..company.task_queue import task_queue, TaskPriority, TaskStatus


router = APIRouter(prefix="/api/company", tags=["company"])


class AddAgentRequest(BaseModel):
    name: str
    role: str
    department: DepartmentType
    skills: Optional[List[str]] = None


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


@router.get("/stats")
async def get_company_stats():
    return company_manager.get_company_stats()


@router.get("/departments")
async def get_departments():
    return {
        "departments": [
            {
                "id": d.id,
                "name": d.name,
                "type": d.type,
                "description": d.description,
                "agent_count": len(d.agents),
                "active_tasks": d.active_tasks,
                "completed_tasks": d.completed_tasks
            }
            for d in company_manager.get_all_departments()
        ]
    }


@router.get("/departments/{dept_type}")
async def get_department(dept_type: DepartmentType):
    dept = company_manager.get_department(dept_type)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return {
        "id": dept.id,
        "name": dept.name,
        "type": dept.type,
        "description": dept.description,
        "agents": [
            {
                "id": a.id,
                "name": a.name,
                "role": a.role,
                "status": a.status,
                "behavior": a.behavior,
                "skills": a.skills,
                "tasks_completed": a.tasks_completed,
                "tasks_failed": a.tasks_failed,
                "tokens_used": a.tokens_used,
                "last_active": a.last_active
            }
            for a in dept.agents
        ]
    }


@router.get("/agents")
async def get_all_agents():
    return {
        "agents": [
            {
                "id": a.id,
                "name": a.name,
                "role": a.role,
                "department": a.department,
                "status": a.status,
                "behavior": a.behavior,
                "skills": a.skills,
                "tasks_completed": a.tasks_completed,
                "tasks_failed": a.tasks_failed,
                "tokens_used": a.tokens_used,
                "last_active": a.last_active
            }
            for a in company_manager.get_all_agents()
        ]
    }


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = company_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/agents")
async def add_agent(request: AddAgentRequest):
    agent = company_manager.add_agent(
        name=request.name,
        role=request.role,
        dept_type=request.department,
        skills=request.skills
    )
    if not agent:
        raise HTTPException(status_code=400, detail="Failed to add agent")
    return agent


@router.delete("/agents/{agent_id}")
async def remove_agent(agent_id: str):
    if not company_manager.remove_agent(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent removed successfully"}


@router.put("/agents/{agent_id}/move")
async def move_agent(agent_id: str, request: MoveAgentRequest):
    if not company_manager.move_agent(agent_id, request.new_department):
        raise HTTPException(status_code=404, detail="Failed to move agent")
    return {"message": "Agent moved successfully"}


@router.put("/agents/{agent_id}/status")
async def update_agent_status(agent_id: str, request: UpdateAgentStatusRequest):
    if not company_manager.update_agent_status(agent_id, request.status, request.behavior):
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Status updated successfully"}


@router.post("/tasks")
async def create_task(request: CreateTaskRequest):
    task = task_queue.create_task(
        title=request.title,
        description=request.description,
        department=request.department,
        priority=request.priority,
        assigned_to=request.assigned_to
    )
    return task


@router.get("/tasks")
async def get_tasks(
    department: Optional[DepartmentType] = None,
    status: Optional[TaskStatus] = None
):
    tasks = task_queue.get_all_tasks(department, status)
    return {
        "tasks": [t.model_dump() for t in tasks],
        "stats": task_queue.get_task_stats()
    }


@router.get("/tasks/pending")
async def get_pending_tasks(department: Optional[DepartmentType] = None):
    return {
        "tasks": [t.model_dump() for t in task_queue.get_pending_tasks(department)]
    }


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    task = task_queue.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, request: UpdateTaskRequest):
    task = task_queue.update_task(task_id, **request.model_dump(exclude_none=True))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    if not task_queue.delete_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


@router.post("/tasks/{task_id}/start")
async def start_task(task_id: str, agent_id: str):
    task = task_queue.start_task(task_id, agent_id)
    if not task:
        raise HTTPException(status_code=400, detail="Task cannot be started")
    company_manager.assign_task_to_agent(agent_id, task_id)
    return task


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, result: Optional[str] = None, error: Optional[str] = None):
    task = task_queue.complete_task(task_id, result, error)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.assigned_to:
        company_manager.complete_task(task.assigned_to, error is None)
    
    return task


@router.get("/tasks/stats")
async def get_task_stats():
    return task_queue.get_task_stats()