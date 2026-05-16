import uuid
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from ..agents.base import (
    Company, Department, DepartmentType, Agent, AgentStatus, AgentBehavior
)
from ..agents.base import Company as CompanyModel


class CompanyManager:
    def __init__(self):
        self.company = CompanyModel()
        self._init_departments()
        self._load_from_redis()

    def _init_departments(self):
        departments_config = [
            {"type": DepartmentType.SALES, "name": "Sales", "description": "Customer acquisition and sales"},
            {"type": DepartmentType.ENGINEERING, "name": "Engineering", "description": "Software development and maintenance"},
            {"type": DepartmentType.MARKETING, "name": "Marketing", "description": "Brand and customer engagement"},
            {"type": DepartmentType.FINANCE, "name": "Finance", "description": "Financial planning and tracking"},
            {"type": DepartmentType.OPERATIONS, "name": "Operations", "description": "Day-to-day operations and logistics"},
            {"type": DepartmentType.PRODUCT, "name": "Product", "description": "Product design and user experience"},
            {"type": DepartmentType.SUPPORT, "name": "Support", "description": "Customer support and service"},
            {"type": DepartmentType.HR, "name": "HR", "description": "Recruitment and employee management"},
            {"type": DepartmentType.LEGAL, "name": "Legal", "description": "Legal and compliance"},
            {"type": DepartmentType.CUSTOMER_SERVICE, "name": "Customer Service", "description": "Customer service and relations"},
        ]
        
        for config in departments_config:
            dept = Department(
                id=str(uuid.uuid4()),
                name=config["name"],
                type=config["type"],
                description=config["description"]
            )
            self.company.departments.append(dept)

    def _load_from_redis(self):
        try:
            import redis
            client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            data = client.get('company:data')
            if data:
                self.company = CompanyModel(**json.loads(data))
        except:
            pass

    def _save_to_redis(self):
        try:
            import redis
            client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
            client.set('company:data', self.company.model_dump_json())
        except:
            pass

    def get_all_departments(self) -> List[Department]:
        return self.company.departments

    def get_department(self, dept_type: DepartmentType) -> Optional[Department]:
        return self.company.get_department(dept_type)

    def get_department_agents(self, dept_type: DepartmentType) -> List[Agent]:
        dept = self.get_department(dept_type)
        return dept.agents if dept else []

    def get_all_agents(self) -> List[Agent]:
        agents = []
        for dept in self.company.departments:
            agents.extend(dept.agents)
        return agents

    def add_agent(self, name: str, role: str, dept_type: DepartmentType, skills: List[str] = None) -> Optional[Agent]:
        agent = Agent(
            name=name,
            role=role,
            department=dept_type,
            skills=skills or []
        )
        
        if self.company.add_agent(agent, dept_type):
            self._save_to_redis()
            return agent
        return None

    def remove_agent(self, agent_id: str) -> bool:
        if self.company.remove_agent(agent_id):
            self._save_to_redis()
            return True
        return False

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        return self.company.get_agent(agent_id)

    def update_agent_status(self, agent_id: str, status: AgentStatus, behavior: AgentBehavior = None) -> bool:
        agent = self.get_agent(agent_id)
        if agent:
            agent.status = status
            if behavior:
                agent.behavior = behavior
            agent.last_active = datetime.now()
            self._save_to_redis()
            return True
        return False

    def assign_task_to_agent(self, agent_id: str, task_id: str) -> bool:
        agent = self.get_agent(agent_id)
        if agent:
            agent.status = AgentStatus.WORKING
            agent.behavior = AgentBehavior.WORKING
            agent.last_active = datetime.now()
            self._save_to_redis()
            return True
        return False

    def complete_task(self, agent_id: str, success: bool = True):
        agent = self.get_agent(agent_id)
        if agent:
            if success:
                agent.tasks_completed += 1
                agent.status = AgentStatus.SUCCESS
                agent.behavior = AgentBehavior.SUCCESS
            else:
                agent.tasks_failed += 1
                agent.status = AgentStatus.ERROR
                agent.behavior = AgentBehavior.ERROR
            agent.last_active = datetime.now()
            self._save_to_redis()

    def move_agent(self, agent_id: str, new_dept_type: DepartmentType) -> bool:
        agent = self.get_agent(agent_id)
        if not agent:
            return False
        
        if self.company.remove_agent(agent_id):
            agent.department = new_dept_type
            self.company.add_agent(agent, new_dept_type)
            self._save_to_redis()
            return True
        return False

    def get_company_stats(self) -> Dict[str, Any]:
        total_agents = sum(len(d.agents) for d in self.company.departments)
        total_completed = sum(d.completed_tasks for d in self.company.departments)
        total_active = sum(d.active_tasks for d in self.company.departments)
        total_tokens = sum(a.tokens_used for a in self.get_all_agents())
        
        return {
            "company_name": self.company.name,
            "total_departments": len(self.company.departments),
            "total_agents": total_agents,
            "active_tasks": total_active,
            "completed_tasks": total_completed,
            "total_tokens": total_tokens,
            "departments": [
                {
                    "id": d.id,
                    "name": d.name,
                    "type": d.type,
                    "agent_count": len(d.agents),
                    "active_tasks": d.active_tasks,
                    "completed_tasks": d.completed_tasks
                }
                for d in self.company.departments
            ]
        }


company_manager = CompanyManager()