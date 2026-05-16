import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AgentStatus(str, Enum):
    IDLE = "idle"
    WORKING = "working"
    THINKING = "thinking"
    MEETING = "meeting"
    BREAK = "break"
    ERROR = "error"
    SUCCESS = "success"
    TRAVELING = "traveling"


class AgentBehavior(str, Enum):
    IDLE = "idle"
    WORKING = "working"
    THINKING = "thinking"
    MEETING = "meeting"
    BREAK = "break"
    TRAVELING = "traveling"
    ERROR = "error"
    SUCCESS = "success"
    WAITING = "waiting"
    RESEARCHING = "researching"
    DEBUGGING = "debugging"
    PLANNING = "planning"
    COMMUNICATING = "communicating"
    ANALYZING = "analyzing"
    CREATING = "creating"
    REVIEWING = "reviewing"
    TESTING = "testing"
    DEPLOYING = "deploying"


class DepartmentType(str, Enum):
    SALES = "sales"
    ENGINEERING = "engineering"
    MARKETING = "marketing"
    FINANCE = "finance"
    OPERATIONS = "operations"
    PRODUCT = "product"
    SUPPORT = "support"
    HR = "hr"
    LEGAL = "legal"
    CUSTOMER_SERVICE = "customer_service"


class Agent(BaseModel):
    id: str = str(uuid.uuid4())
    name: str
    role: str
    department: DepartmentType
    status: AgentStatus = AgentStatus.IDLE
    behavior: AgentBehavior = AgentBehavior.IDLE
    avatar: Optional[str] = None
    skills: List[str] = []
    tasks_completed: int = 0
    tasks_failed: int = 0
    tokens_used: int = 0
    created_at: datetime = datetime.now()
    last_active: Optional[datetime] = None

    class Config:
        use_enum_values = True


class Department(BaseModel):
    id: str = str(uuid.uuid4())
    name: str
    type: DepartmentType
    description: str = ""
    agents: List[Agent] = []
    active_tasks: int = 0
    completed_tasks: int = 0
    created_at: datetime = datetime.now()

    class Config:
        use_enum_values = True


class Company(BaseModel):
    id: str = str(uuid.uuid4())
    name: str = "AgentForge Inc."
    departments: List[Department] = []
    founded_at: datetime = datetime.now()

    def get_department(self, dept_type: DepartmentType) -> Optional[Department]:
        for dept in self.departments:
            if dept.type == dept_type:
                return dept
        return None

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        for dept in self.departments:
            for agent in dept.agents:
                if agent.id == agent_id:
                    return agent
        return None

    def add_agent(self, agent: Agent, dept_type: DepartmentType) -> bool:
        dept = self.get_department(dept_type)
        if dept:
            dept.agents.append(agent)
            return True
        return False

    def remove_agent(self, agent_id: str) -> bool:
        for dept in self.departments:
            for i, agent in enumerate(dept.agents):
                if agent.id == agent_id:
                    dept.agents.pop(i)
                    return True
        return False