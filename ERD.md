# ERD / Database Schema — AgentForge

## 1. Database Overview

## Primary Database

* PostgreSQL

## Secondary Storage

* Redis → queue/cache/session
* Qdrant → vector memory (future)

---

# 2. Core Design Principles

## Separation of Concerns

Pisahkan:

* user
* provider
* project
* execution
* workflow
* memory
* audit

---

## Multi-Provider Ready

Satu user dapat memiliki banyak:

* provider
* API key
* model profile

---

## Execution-Centric

Semua aktivitas agent harus traceable.

---

# 3. High-Level ERD

```text id="z2qkt8"
USERS
 ├── PROVIDERS
 ├── PROJECTS
 │     ├── EXECUTIONS
 │     │      ├── EXECUTION_LOGS
 │     │      ├── TOOL_EXECUTIONS
 │     │      └── CHAT_MESSAGES
 │     │
 │     ├── PROJECT_FILES
 │     ├── CONTAINERS
 │     └── WORKFLOW_RUNS
 │
 ├── WORKFLOWS
 ├── MODEL_ROUTING_RULES
 ├── API_USAGE
 └── AUDIT_LOGS
```

---

# 4. Main Tables

# 4.1 users

## Purpose

Authentication & ownership.

```sql id="55e70g"
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,

    password_hash TEXT,
    auth_provider VARCHAR(50) DEFAULT 'local',

    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.2 providers

## Purpose

Store encrypted API keys.

```sql id="5shkhw"
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    provider_name VARCHAR(50) NOT NULL,
    provider_type VARCHAR(50),

    api_key_encrypted TEXT NOT NULL,

    base_url TEXT,
    organization_id TEXT,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.3 provider_models

## Purpose

Per-provider model registry.

```sql id="rz4vzw"
CREATE TABLE provider_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

    model_name VARCHAR(255) NOT NULL,

    supports_tools BOOLEAN DEFAULT false,
    supports_vision BOOLEAN DEFAULT false,
    supports_streaming BOOLEAN DEFAULT true,

    context_window INTEGER,
    max_output_tokens INTEGER,

    cost_input NUMERIC(10,6),
    cost_output NUMERIC(10,6),

    latency_score INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.4 projects

## Purpose

Project metadata.

```sql id="1xjz2r"
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    description TEXT,

    runtime VARCHAR(50),
    framework VARCHAR(50),

    local_path TEXT NOT NULL,

    status VARCHAR(50) DEFAULT 'idle',

    default_branch VARCHAR(100) DEFAULT 'main',

    container_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.5 project_settings

## Purpose

Per-project config.

```sql id="kgivwg"
CREATE TABLE project_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    default_provider_id UUID REFERENCES providers(id),

    default_model VARCHAR(255),

    cpu_limit NUMERIC(5,2) DEFAULT 2,
    memory_limit_mb INTEGER DEFAULT 4096,

    auto_restart BOOLEAN DEFAULT false,
    auto_fix_enabled BOOLEAN DEFAULT false,

    environment JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.6 workflows

## Purpose

Reusable workflow templates.

```sql id="gvhkg4"
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,

    description TEXT,

    workflow_type VARCHAR(50),

    definition JSONB NOT NULL,

    is_public BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.7 workflow_runs

## Purpose

Execution history of workflows.

```sql id="c2z5hj"
CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,

    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    execution_id UUID,

    status VARCHAR(50),

    started_at TIMESTAMP,
    finished_at TIMESTAMP,

    result_summary TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.8 executions

## Purpose

Core execution/session table.

```sql id="7w11vw"
CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    triggered_by_user_id UUID REFERENCES users(id),

    execution_type VARCHAR(50),

    status VARCHAR(50) DEFAULT 'queued',

    current_step TEXT,

    provider_name VARCHAR(100),
    model_name VARCHAR(255),

    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,

    estimated_cost NUMERIC(10,6) DEFAULT 0,

    started_at TIMESTAMP,
    finished_at TIMESTAMP,

    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.9 execution_logs

## Purpose

Streaming logs.

```sql id="rqjlwm"
CREATE TABLE execution_logs (
    id BIGSERIAL PRIMARY KEY,

    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,

    log_level VARCHAR(20),
    source VARCHAR(50),

    message TEXT NOT NULL,

    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.10 tool_executions

## Purpose

Track all tool calls.

```sql id="hmj0aj"
CREATE TABLE tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,

    tool_name VARCHAR(100) NOT NULL,

    input JSONB,
    output JSONB,

    success BOOLEAN DEFAULT true,

    duration_ms INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.11 chat_sessions

## Purpose

Conversation grouping.

```sql id="ew8n0y"
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    title VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.12 chat_messages

## Purpose

Persistent memory.

```sql id="4cjqho"
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

    execution_id UUID REFERENCES executions(id),

    role VARCHAR(50),

    content TEXT NOT NULL,

    provider_name VARCHAR(100),
    model_name VARCHAR(255),

    token_count INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.13 containers

## Purpose

Docker container registry.

```sql id="b26d3c"
CREATE TABLE containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    docker_container_id TEXT UNIQUE,

    image_name TEXT,
    container_name TEXT,

    status VARCHAR(50),

    ports JSONB,

    cpu_limit NUMERIC(5,2),
    memory_limit_mb INTEGER,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.14 project_files

## Purpose

Optional file indexing.

```sql id="a8eqkm"
CREATE TABLE project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    relative_path TEXT NOT NULL,

    checksum TEXT,

    size_bytes BIGINT,

    indexed_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.15 audit_logs

## Purpose

Security & compliance.

```sql id="b6q5sj"
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,

    user_id UUID REFERENCES users(id),

    action VARCHAR(255),

    target_type VARCHAR(100),
    target_id UUID,

    metadata JSONB,

    ip_address INET,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.16 api_usage

## Purpose

Cost tracking.

```sql id="xw0g1g"
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES users(id),

    provider_name VARCHAR(100),
    model_name VARCHAR(255),

    input_tokens INTEGER,
    output_tokens INTEGER,

    estimated_cost NUMERIC(10,6),

    execution_id UUID REFERENCES executions(id),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4.17 model_routing_rules

## Purpose

Dynamic model selection.

```sql id="3h5p1j"
CREATE TABLE model_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES users(id),

    task_type VARCHAR(100),

    preferred_provider VARCHAR(100),
    preferred_model VARCHAR(255),

    max_cost_per_1k NUMERIC(10,6),

    max_latency_ms INTEGER,

    fallback_provider VARCHAR(100),
    fallback_model VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 5. Future Tables

# 5.1 vector_memories

```sql id="8ulxq7"
CREATE TABLE vector_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID REFERENCES projects(id),

    embedding_id TEXT,

    content TEXT,

    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 5.2 self_healing_events

```sql id="r1a6j4"
CREATE TABLE self_healing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID REFERENCES projects(id),

    execution_id UUID REFERENCES executions(id),

    issue_type VARCHAR(100),

    detected_error TEXT,

    proposed_fix TEXT,

    applied BOOLEAN DEFAULT false,

    success BOOLEAN,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 6. Relationship Summary

| Parent        | Child           |
| ------------- | --------------- |
| users         | providers       |
| users         | projects        |
| users         | workflows       |
| projects      | executions      |
| projects      | containers      |
| projects      | chat_sessions   |
| executions    | execution_logs  |
| executions    | tool_executions |
| chat_sessions | chat_messages   |

---

# 7. Recommended Indexes

## Performance Critical

```sql id="6lg4pd"
CREATE INDEX idx_projects_user_id
ON projects(user_id);
```

```sql id="a6q5ae"
CREATE INDEX idx_executions_project_id
ON executions(project_id);
```

```sql id="8b92qz"
CREATE INDEX idx_execution_logs_execution_id
ON execution_logs(execution_id);
```

```sql id="xntx0d"
CREATE INDEX idx_chat_messages_session_id
ON chat_messages(session_id);
```

```sql id="klc2iw"
CREATE INDEX idx_tool_executions_execution_id
ON tool_executions(execution_id);
```

---

# 8. Suggested Storage Strategy

| Data Type           | Storage                           |
| ------------------- | --------------------------------- |
| Metadata            | PostgreSQL                        |
| Logs                | PostgreSQL → later object storage |
| Vector memory       | Qdrant                            |
| File contents       | Filesystem                        |
| Container artifacts | Docker volumes                    |

---

# 9. Scaling Notes

## MVP

Single PostgreSQL instance.

---

## Future

Can split:

* execution logs
* analytics
* vector memory
* audit system

into separate services.

---

# 10. Recommended MVP Tables

## Must Have

✅ users
✅ providers
✅ projects
✅ executions
✅ execution_logs
✅ tool_executions
✅ chat_sessions
✅ chat_messages
✅ containers

---

## Can Wait

❌ vector_memories
❌ self_healing_events
❌ project_files
❌ api_usage analytics detail
❌ advanced routing rules
