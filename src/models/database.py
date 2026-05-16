from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, JSON, ForeignKey, Numeric, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
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
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
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
    metadata = Column(JSON)
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