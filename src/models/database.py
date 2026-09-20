import os
from typing import Optional
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, JSON, ForeignKey, Numeric, BigInteger, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True)
    password_hash = Column(Text)
    auth_provider = Column(String(50), default='local')
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Provider(Base):
    __tablename__ = "providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider_name = Column(String(50), nullable=False)
    provider_type = Column(String(50))
    api_key_encrypted = Column(Text, nullable=False)
    base_url = Column(Text)
    organization_id = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # nullable until real auth ships (v1 is single-tenant / API-key based, see ANALYSIS.md gap #6)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    local_path = Column(Text)
    repo_url = Column(Text)
    source_type = Column(String(50), default='local')
    default_branch = Column(String(100), default='main')
    auto_healing_enabled = Column(Boolean, default=False)
    auto_pull_enabled = Column(Boolean, default=True)
    auto_push_enabled = Column(Boolean, default=True)
    status = Column(String(50), default='idle')
    container_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Execution(Base):
    __tablename__ = "executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    triggered_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    execution_type = Column(String(50))
    status = Column(String(50), default='queued')
    current_step = Column(Text)
    provider_name = Column(String(100))
    model_name = Column(String(255))
    total_input_tokens = Column(Integer, default=0)
    total_output_tokens = Column(Integer, default=0)
    estimated_cost = Column(Numeric(10, 6), default=0)
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    execution_id = Column(UUID(as_uuid=True), ForeignKey('executions.id', ondelete='CASCADE'), nullable=False)
    log_level = Column(String(20))
    source = Column(String(50))
    message = Column(Text, nullable=False)
    log_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Container(Base):
    __tablename__ = "containers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    docker_container_id = Column(Text, unique=True)
    image_name = Column(Text)
    container_name = Column(Text)
    status = Column(String(50))
    ports = Column(JSON)
    cpu_limit = Column(Numeric(5, 2))
    memory_limit_mb = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='SET NULL'))
    title = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False)
    execution_id = Column(UUID(as_uuid=True), ForeignKey('executions.id'))
    role = Column(String(50))
    content = Column(Text, nullable=False)
    provider_name = Column(String(100))
    model_name = Column(String(255))
    token_count = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Worker(Base):
    """A monitored external worker/agent container (content engine, trading bot, market scanner, etc.)."""
    __tablename__ = "workers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=True)
    name = Column(String(255), nullable=False)
    worker_type = Column(String(100))
    heartbeat_interval_seconds = Column(Integer, default=60)
    last_heartbeat_at = Column(DateTime(timezone=True))
    status = Column(String(50), default='unknown')
    metadata_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Department(Base):
    """A department in the AI-company simulation (Sales, Engineering, IT/Ops, etc.)."""
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(50), unique=True, nullable=False)
    description = Column(Text, default="")
    active_tasks = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CompanyAgent(Base):
    """An agent in the AI-company simulation. The 'Ops Engine' agent (department type
    'operations') is the designated agent whose status/behavior is driven by the real
    self-healing worker, not by manual API calls — see src/worker/worker.py."""
    __tablename__ = "company_agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    status = Column(String(50), default='idle')
    behavior = Column(String(50), default='idle')
    skills = Column(JSON, default=list)
    is_system_agent = Column(Boolean, default=False)
    tasks_completed = Column(Integer, default=0)
    tasks_failed = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    hourly_rate = Column(Numeric(10, 2), default=0)
    monthly_budget = Column(Numeric(10, 2), default=0)
    last_active = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class CompanyTask(Base):
    """A generic company-sim work item (unrelated to healing tasks/HealingRecord)."""
    __tablename__ = "company_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey('company_agents.id', ondelete='SET NULL'), nullable=True)
    priority = Column(String(20), default='medium')
    status = Column(String(20), default='pending')
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    result = Column(Text)
    error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class HealingRecord(Base):
    """One healing task, from detection through resolution (replaces the old in-memory healing_history list)."""
    __tablename__ = "healing_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String(255), unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    project_name = Column(String(255))
    source = Column(String(50), default='manual')
    classification = Column(JSON)
    status = Column(String(50), default='queued')
    result = Column(JSON)
    # links this healing task to the company-sim agent that "did the work" (the Ops
    # Engine agent) so the Office UI can show a real work history, not a fake feed.
    handled_by_agent_id = Column(UUID(as_uuid=True), ForeignKey('company_agents.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


def _to_async_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


DATABASE_URL = _to_async_url(os.getenv("DATABASE_URL", "postgresql://agentforge:password@localhost:5432/agentforge"))

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    """Create tables if they don't exist. Called once on app startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _patch_missing_columns(conn)
    await seed_company_defaults()


async def _patch_missing_columns(conn):
    """There's no real migration tool (Alembic) wired up yet — Base.metadata.create_all
    only creates brand-new tables, it never alters existing ones. This is a stopgap for
    columns added after a table already existed on someone's running Postgres; replace
    with proper migrations before this ships as a real product."""
    from sqlalchemy import text

    await conn.execute(text(
        "ALTER TABLE healing_records "
        "ADD COLUMN IF NOT EXISTS handled_by_agent_id UUID REFERENCES company_agents(id) ON DELETE SET NULL"
    ))


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


DEFAULT_DEPARTMENTS = [
    {"type": "sales", "name": "Sales", "description": "Customer acquisition and sales"},
    {"type": "engineering", "name": "Engineering", "description": "Software development and maintenance"},
    {"type": "marketing", "name": "Marketing", "description": "Brand and customer engagement"},
    {"type": "finance", "name": "Finance", "description": "Financial planning and tracking"},
    {"type": "operations", "name": "IT/Ops", "description": "Infrastructure monitoring and self-healing"},
    {"type": "product", "name": "Product", "description": "Product design and user experience"},
    {"type": "support", "name": "Support", "description": "Customer support and service"},
    {"type": "hr", "name": "HR", "description": "Recruitment and employee management"},
    {"type": "legal", "name": "Legal", "description": "Legal and compliance"},
    {"type": "customer_service", "name": "Customer Service", "description": "Customer service and relations"},
]

OPS_ENGINE_AGENT_NAME = "Ops Engine"


async def seed_company_defaults():
    """Create the default departments and the designated 'Ops Engine' system agent if
    they don't exist yet. The Ops Engine agent's status/behavior is driven by the real
    self-healing worker (src/worker/worker.py), not by manual API calls."""
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Department))
        existing = {d.type: d for d in result.scalars().all()}

        for config in DEFAULT_DEPARTMENTS:
            if config["type"] not in existing:
                dept = Department(**config)
                session.add(dept)
                existing[config["type"]] = dept

        await session.commit()

        ops_dept = existing.get("operations")
        if ops_dept:
            await session.refresh(ops_dept)
            result = await session.execute(
                select(CompanyAgent).where(
                    CompanyAgent.department_id == ops_dept.id,
                    CompanyAgent.is_system_agent == True  # noqa: E712
                )
            )
            if not result.scalar_one_or_none():
                session.add(CompanyAgent(
                    department_id=ops_dept.id,
                    name=OPS_ENGINE_AGENT_NAME,
                    role="Self-Healing Engine",
                    status="idle",
                    behavior="idle",
                    is_system_agent=True,
                    skills=["monitoring", "log-analysis", "auto-remediation"],
                ))
                await session.commit()


async def get_ops_engine_agent_id() -> Optional[str]:
    """Look up the designated Ops Engine agent's id. Used by the worker to attribute
    healing activity to a real, visible agent in the Office view."""
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(CompanyAgent).where(CompanyAgent.is_system_agent == True)  # noqa: E712
        )
        agent = result.scalar_one_or_none()
        return str(agent.id) if agent else None
