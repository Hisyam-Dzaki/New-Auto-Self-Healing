import uuid
import json
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from ..agents.base import DepartmentType


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


class Task(BaseModel):
    id: str = str(uuid.uuid4())
    title: str
    description: str = ""
    department: DepartmentType
    assigned_to: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = datetime.now()
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[str] = None
    error: Optional[str] = None


class TaskQueue:
    def __init__(self):
        self._tasks: Dict[str, Task] = {}
        self._load_from_redis()

    def _load_from_redis(self):
        try:
            import redis
            client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            tasks_data = client.hgetall('tasks:all')
            for task_id, data in tasks_data.items():
                self._tasks[task_id] = Task(**json.loads(data))
        except:
            pass

    def _save_to_redis(self, task: Task):
        try:
            import redis
            client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            client.hset('tasks:all', task.id, task.model_dump_json())
        except:
            pass

    def _delete_from_redis(self, task_id: str):
        try:
            import redis
            client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            client.hdel('tasks:all', task_id)
        except:
            pass

    def create_task(
        self,
        title: str,
        description: str,
        department: DepartmentType,
        priority: TaskPriority = TaskPriority.MEDIUM,
        assigned_to: Optional[str] = None
    ) -> Task:
        task = Task(
            title=title,
            description=description,
            department=department,
            priority=priority,
            assigned_to=assigned_to
        )
        self._tasks[task.id] = task
        self._save_to_redis(task)
        return task

    def get_task(self, task_id: str) -> Optional[Task]:
        return self._tasks.get(task_id)

    def get_all_tasks(self, department: Optional[DepartmentType] = None, status: Optional[TaskStatus] = None) -> List[Task]:
        tasks = list(self._tasks.values())
        
        if department:
            tasks = [t for t in tasks if t.department == department]
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        return sorted(tasks, key=lambda x: (
            TaskPriority(x.priority).value,
            x.created_at
        ), reverse=True)

    def get_pending_tasks(self, department: Optional[DepartmentType] = None) -> List[Task]:
        return self.get_all_tasks(department, TaskStatus.PENDING)

    def start_task(self, task_id: str, agent_id: str) -> Optional[Task]:
        task = self._tasks.get(task_id)
        if task and task.status == TaskStatus.PENDING:
            task.status = TaskStatus.PROCESSING
            task.assigned_to = agent_id
            task.started_at = datetime.now()
            self._save_to_redis(task)
            return task
        return None

    def complete_task(self, task_id: str, result: Optional[str] = None, error: Optional[str] = None) -> Optional[Task]:
        task = self._tasks.get(task_id)
        if task:
            task.completed_at = datetime.now()
            if error:
                task.status = TaskStatus.FAILED
                task.error = error
            else:
                task.status = TaskStatus.COMPLETED
                task.result = result
            self._save_to_redis(task)
            return task
        return None

    def update_task(self, task_id: str, **kwargs) -> Optional[Task]:
        task = self._tasks.get(task_id)
        if task:
            for key, value in kwargs.items():
                if hasattr(task, key):
                    setattr(task, key, value)
            self._save_to_redis(task)
            return task
        return None

    def delete_task(self, task_id: str) -> bool:
        if task_id in self._tasks:
            del self._tasks[task_id]
            self._delete_from_redis(task_id)
            return True
        return False

    def assign_task(self, task_id: str, agent_id: str) -> Optional[Task]:
        return self.update_task(task_id, assigned_to=agent_id)

    def get_task_stats(self) -> Dict[str, Any]:
        total = len(self._tasks)
        pending = len([t for t in self._tasks.values() if t.status == TaskStatus.PENDING])
        processing = len([t for t in self._tasks.values() if t.status == TaskStatus.PROCESSING])
        completed = len([t for t in self._tasks.values() if t.status == TaskStatus.COMPLETED])
        failed = len([t for t in self._tasks.values() if t.status == TaskStatus.FAILED])

        dept_stats = {}
        for dept in DepartmentType:
            dept_tasks = [t for t in self._tasks.values() if t.department == dept]
            dept_stats[dept.value] = {
                "total": len(dept_tasks),
                "pending": len([t for t in dept_tasks if t.status == TaskStatus.PENDING]),
                "processing": len([t for t in dept_tasks if t.status == TaskStatus.PROCESSING]),
                "completed": len([t for t in dept_tasks if t.status == TaskStatus.COMPLETED]),
            }

        return {
            "total": total,
            "pending": pending,
            "processing": processing,
            "completed": completed,
            "failed": failed,
            "by_department": dept_stats
        }


task_queue = TaskQueue()