# TRD — Technical Requirements Document

## Project: AgentForge — Local-First AI Agent Platform

---

# 1. Technical Overview

## Objective

Membangun platform AI agent modular yang mampu:

* menjalankan workflow development otomatis,
* mengelola project dalam container terisolasi,
* menggunakan multi-provider LLM,
* mendukung orchestration tools,
* dan dapat berkembang menjadi autonomous self-healing system.

Platform berjalan:

* local-first,
* extensible,
* provider-agnostic,
* secure-by-default.

---

# 2. System Architecture

## High-Level Architecture

```text id="dsh7sj"
┌────────────────────┐
│     WEB UI         │
│ React / Next.js    │
└─────────┬──────────┘
          │ HTTP/WebSocket
┌─────────▼──────────┐
│    API SERVER      │
│ FastAPI            │
└─────────┬──────────┘
          │
 ┌────────▼────────┐
 │   AGENT CORE    │
 │ Planner/Router  │
 └────────┬────────┘
          │
 ┌────────▼────────┐
 │   TOOL LAYER    │
 └────────┬────────┘
          │
 ┌────────▼────────┐
 │ EXECUTION LAYER │
 │ Docker Engine   │
 └─────────────────┘
```

---

# 3. Core Modules

# 3.1 Frontend Layer

## Stack

* Next.js
* React
* TypeScript
* TailwindCSS
* Zustand / Redux
* Socket.IO client

---

## Responsibilities

* AI chat UI
* project management
* logs viewer
* workflow editor
* provider/model selector
* execution monitoring

---

## Functional Requirements

### Chat Workspace

* streaming response
* markdown rendering
* code block support
* execution progress UI

### Project Dashboard

* create/delete project
* project status
* container status
* logs access

### Settings Panel

* API key management
* provider configuration
* workflow configuration

---

# 3.2 Backend API Layer

## Stack

* FastAPI
* Uvicorn
* Pydantic
* SQLAlchemy
* Alembic

---

## Responsibilities

* REST API
* WebSocket streaming
* auth/session
* execution orchestration
* DB access
* provider abstraction

---

## API Standards

### REST Naming

```http id="ibj0u6"
GET /projects
POST /projects
GET /projects/{id}
DELETE /projects/{id}
```

---

## Response Format

```json id="fjzqzb"
{
  "success": true,
  "data": {},
  "error": null
}
```

---

# 3.3 Agent Core

## Responsibilities

* task planning
* reasoning loop
* tool selection
* memory handling
* retry handling
* validation

---

## Internal Modules

| Module          | Responsibility          |
| --------------- | ----------------------- |
| Planner         | Break prompt into tasks |
| Router          | Select model/provider   |
| Executor        | Run tools               |
| Validator       | Validate output         |
| Recovery        | Retry/fix failures      |
| Context Manager | Maintain memory         |

---

## Agent Execution Pipeline

```text id="zwp0j0"
Prompt
 ↓
Planning
 ↓
Tool Selection
 ↓
Execution
 ↓
Validation
 ↓
Retry / Finish
```

---

# 4. LLM Provider Layer

# Objective

Unified abstraction untuk semua model provider.

---

## Supported Providers

| Provider     | Status |
| ------------ | ------ |
| OpenAI       | MVP    |
| Anthropic    | MVP    |
| Gemini       | MVP    |
| OpenRouter   | MVP    |
| Ollama       | MVP    |
| DeepSeek API | MVP    |
| Groq         | Future |
| LM Studio    | Future |

---

# Provider Interface

## Standard Interface

```python id="9qhksw"
class BaseLLMProvider:
    async def chat(self, messages, tools=None):
        pass

    async def stream(self, messages):
        pass
```

---

# Dynamic Model Routing

## Requirements

System harus dapat:

* memilih model otomatis
* fallback provider
* budget-aware routing
* latency-aware routing

---

## Example Rules

```yaml id="b42tn7"
routing:
  planning:
    provider: anthropic
    model: claude-opus

  coding:
    provider: deepseek
    model: deepseek-coder

  summarization:
    provider: openai
    model: gpt-lite
```

---

# 5. Tool Layer

## Architecture

```text id="lj0it4"
Agent
  ↓
Tool Registry
  ↓
Tool Executor
  ↓
Specific Tool
```

---

## Tool Interface

```python id="b6kmlq"
class BaseTool:
    name: str
    description: str

    async def execute(self, input):
        pass
```

---

# Initial Tools

| Tool        | Description             |
| ----------- | ----------------------- |
| FileTool    | Read/write/search files |
| DockerTool  | Docker control          |
| ShellTool   | Safe command execution  |
| GitTool     | Git operations          |
| LogsTool    | Read logs               |
| ProjectTool | CRUD project            |

---

# 6. Execution Layer

# Objective

Menjalankan project secara isolated.

---

## Runtime

Docker Engine.

---

## Container Strategy

### Per Project Container

```text id="gr29ij"
/projects/project-a
/projects/project-b
```

---

## Restrictions

* no privileged mode
* CPU limit
* RAM limit
* timeout limit
* restricted mounts

---

## Docker SDK

Gunakan:

```python id="g49epr"
docker-py
```

---

## Supported Operations

| Operation | Description      |
| --------- | ---------------- |
| build     | Build image      |
| run       | Run container    |
| stop      | Stop container   |
| restart   | Restart          |
| logs      | Fetch logs       |
| remove    | Remove container |

---

# 7. Filesystem Architecture

## Project Structure

```text id="vlif4u"
/agentforge
 ├── backend
 ├── frontend
 ├── projects
 ├── data
 ├── logs
 └── docker
```

---

## Per Project Structure

```text id="r71l0e"
/projects/myapp
 ├── src
 ├── Dockerfile
 ├── agent.yml
 ├── logs
 └── metadata.json
```

---

# 8. Database Design

## Primary DB

PostgreSQL.

---

# Tables

## users

```sql id="4vul0y"
id
email
password_hash
created_at
```

---

## providers

```sql id="m85r8f"
id
user_id
provider_name
encrypted_api_key
created_at
```

---

## projects

```sql id="kgf2ls"
id
user_id
name
path
runtime
status
created_at
```

---

## executions

```sql id="ev1u20"
id
project_id
status
logs
started_at
ended_at
```

---

## workflows

```sql id="u9bz4j"
id
user_id
name
config_json
```

---

# 9. Memory & Context System

## Short-Term Memory

Session conversation.

Store:

* prompts
* tool calls
* outputs

---

## Long-Term Memory (Future)

Vector DB.

Candidates:

* Qdrant
* Chroma
* Weaviate

---

## Context Compression

Required untuk:

* long logs
* large repositories
* retry cycles

---

# 10. Queue & Async Processing

## Stack

* Redis
* Celery / Dramatiq

---

## Use Cases

* long executions
* retries
* background summarization
* log analysis
* deployment tasks

---

# 11. WebSocket System

## Features

* live logs
* streaming tokens
* container status
* execution progress

---

## Channels

```text id="o4u1rm"
/ws/chat
/ws/logs
/ws/execution
```

---

# 12. Security Requirements

# 12.1 Command Restrictions

## Allowed Commands

Whitelist only.

Example:

```yaml id="jz06od"
allowed:
  - python
  - pip
  - npm
  - node
  - git
  - docker
```

---

## Forbidden

```yaml id="5sz4t3"
blocked:
  - rm -rf /
  - shutdown
  - reboot
  - mkfs
```

---

# 12.2 Filesystem Restrictions

AI hanya boleh akses:

```text id="gzcc7k"
/projects/*
```

---

# 12.3 Docker Restrictions

Forbidden:

* privileged
* host network
* docker socket mount
* arbitrary volume mount

---

# 12.4 Resource Limits

## Default Limits

| Resource          | Limit  |
| ----------------- | ------ |
| CPU               | 2 core |
| RAM               | 4 GB   |
| Execution Timeout | 10 min |

---

# 13. Workflow Engine

## Objective

Reusable execution flow.

---

## Workflow Definition

```yaml id="7uqvbj"
name: fix_backend_bug

steps:
  - analyze_logs
  - inspect_code
  - generate_patch
  - run_tests
  - restart_container
```

---

# Workflow Types

| Type     | Description     |
| -------- | --------------- |
| Build    | Create app      |
| Debug    | Fix issue       |
| Refactor | Improve code    |
| Analyze  | Logs/repository |
| Deploy   | Publish service |

---

# 14. Observability

## Logging

Structured JSON logs.

---

## Metrics

Prometheus-ready.

Metrics:

* token usage
* execution duration
* failure rate
* retry count

---

## Monitoring

Future:

* Grafana
* OpenTelemetry

---

# 15. Self-Healing System (Future)

# Goal

Autonomous recovery loop.

---

## Flow

```text id="g0u2gx"
Detect Error
 ↓
Read Logs
 ↓
Analyze Cause
 ↓
Generate Patch
 ↓
Run Tests
 ↓
Redeploy
```

---

## Requirements

* rollback support
* execution snapshots
* retry limits
* approval gate

---

# 16. Deployment Modes

# Local Mode

Single-user local runtime.

---

# Hybrid Mode

Local UI + remote execution node.

---

# Cloud Mode

Hosted multi-user system.

---

# 17. Scalability Requirements

## MVP Scale

* single machine
* 1–10 concurrent projects

---

## Future Scale

* distributed workers
* Kubernetes execution
* multi-tenant support

---

# 18. Performance Targets

| Metric                  | Target |
| ----------------------- | ------ |
| API latency             | <200ms |
| Tool execution dispatch | <1s    |
| Chat streaming start    | <2s    |
| Container startup       | <10s   |

---

# 19. Failure Recovery

## Required

* execution retry
* container cleanup
* orphan process cleanup
* timeout handling

---

# 20. Config System

## Format

YAML + ENV.

---

## Example

```yaml id="bh7t0q"
agent:
  default_provider: openai

docker:
  cpu_limit: 2
  ram_limit: 4g
```

---

# 21. Testing Requirements

## Backend

* pytest
* integration tests
* tool tests

---

## Frontend

* Playwright
* Vitest

---

## Agent

Simulation testing:

* tool failure
* malformed output
* infinite loop prevention

---

# 22. Suggested Repository Structure

```text id="6s7m8w"
/agentforge
 ├── apps
 │   ├── api
 │   ├── web
 │   └── worker
 │
 ├── packages
 │   ├── agent-core
 │   ├── tool-sdk
 │   ├── provider-sdk
 │   └── shared
 │
 ├── projects
 ├── docker
 ├── scripts
 └── docs
```

---

# 23. Recommended MVP Scope

## Include

✅ chat workspace
✅ Docker execution
✅ file tools
✅ multi-provider API
✅ model routing
✅ logs streaming
✅ project CRUD

---

## Exclude

❌ multi-agent
❌ kubernetes
❌ autonomous deployment
❌ browser automation
❌ full self-healing

---

# 24. Long-Term Vision

Platform berkembang menjadi:

* autonomous development operator
* infra-aware coding agent
* self-healing execution platform
* AI-powered software factory

dengan:

* modular orchestration
* secure sandboxing
* dynamic AI routing
* scalable execution runtime.
