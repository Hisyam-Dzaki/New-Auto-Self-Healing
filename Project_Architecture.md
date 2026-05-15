# Project Architecture — AgentForge

## 1. Architecture Philosophy

AgentForge dibangun sebagai:

* local-first AI runtime
* modular orchestration platform
* secure execution sandbox
* provider-agnostic AI layer
* scalable autonomous agent system

Fokus utama:

> AI tidak hanya menghasilkan kode, tetapi dapat menjalankan lifecycle software secara penuh.

---

# 2. High-Level System Architecture

```text id="n2cqzm"
┌────────────────────────────────────────────┐
│                CLIENTS                     │
│────────────────────────────────────────────│
│ Web UI │ CLI │ API Client │ Mobile Future │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│              API GATEWAY                   │
│────────────────────────────────────────────│
│ Auth │ REST │ WebSocket │ Rate Limit      │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│               AGENT CORE                   │
│────────────────────────────────────────────│
│ Planner │ Router │ Memory │ Validator     │
│ Recovery │ Execution Manager              │
└─────────────────────┬──────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ TOOL LAYER │ │ LLM LAYER  │ │ EVENT BUS  │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘
      │              │              │
      ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ FILE TOOLS │ │ PROVIDERS  │ │ REDIS      │
│ DOCKER     │ │ OpenAI     │ │ QUEUES     │
│ SHELL      │ │ Claude     │ │ EVENTS     │
│ GIT        │ │ Gemini     │ │ STREAMS    │
└─────┬──────┘ │ Ollama     │ └────────────┘
      │        └─────┬──────┘
      ▼              ▼
┌────────────────────────────────────────────┐
│            EXECUTION LAYER                 │
│────────────────────────────────────────────│
│ Docker Runtime │ Sandbox │ Containers      │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│              PROJECTS FS                   │
│────────────────────────────────────────────│
│ /projects/project-a                       │
│ /projects/project-b                       │
└────────────────────────────────────────────┘
```

---

# 3. Monorepo Architecture

## Repository Structure

```text id="oq1t4m"
/agentforge
│
├── apps
│   ├── api
│   ├── web
│   ├── worker
│   └── cli
│
├── packages
│   ├── agent-core
│   ├── provider-sdk
│   ├── tool-sdk
│   ├── workflow-engine
│   ├── docker-runtime
│   ├── memory-engine
│   ├── shared-types
│   └── ui-components
│
├── infrastructure
│   ├── docker
│   ├── nginx
│   ├── scripts
│   └── compose
│
├── projects
│
├── data
│
├── logs
│
└── docs
```

---

# 4. Frontend Architecture

# Stack

* Next.js
* React
* TypeScript
* TailwindCSS
* Zustand
* Socket.IO

---

# Frontend Modules

```text id="btf1ak"
/apps/web
│
├── app
├── components
├── features
│   ├── chat
│   ├── projects
│   ├── logs
│   ├── workflows
│   ├── providers
│   └── settings
│
├── services
├── hooks
├── stores
└── types
```

---

# Core Frontend Features

| Module            | Responsibility        |
| ----------------- | --------------------- |
| Chat UI           | AI conversation       |
| Execution Viewer  | Live execution state  |
| Logs Panel        | Stream logs           |
| Model Selector    | Choose provider/model |
| Workflow Builder  | Configure flows       |
| Project Dashboard | Project management    |

---

# 5. Backend Architecture

# Stack

* FastAPI
* Python
* SQLAlchemy
* Redis
* PostgreSQL

---

# Backend Structure

```text id="k2oz70"
/apps/api
│
├── api
├── core
├── services
├── models
├── repositories
├── agents
├── tools
├── providers
├── workflows
├── execution
├── websocket
└── security
```

---

# Backend Layers

## API Layer

HTTP & WebSocket interface.

---

## Service Layer

Business logic.

---

## Repository Layer

Database abstraction.

---

## Agent Layer

Reasoning & orchestration.

---

## Tool Layer

System capabilities.

---

# 6. Agent Core Architecture

# Goal

Menjadi orchestration brain.

---

# Agent Pipeline

```text id="20b3nv"
User Prompt
    ↓
Prompt Normalizer
    ↓
Task Planner
    ↓
Model Router
    ↓
Tool Selector
    ↓
Execution Engine
    ↓
Validation Layer
    ↓
Result Formatter
```

---

# Agent Components

| Component        | Purpose            |
| ---------------- | ------------------ |
| Planner          | Task breakdown     |
| Router           | Select LLM         |
| Executor         | Run tools          |
| Validator        | Validate outputs   |
| Memory Manager   | Context handling   |
| Recovery Manager | Retry/fix failures |

---

# 7. Multi-Provider LLM Architecture

# Objective

Decouple provider implementation.

---

# Provider Abstraction

```python id="i7wphm"
class BaseProvider:
    async def complete(self, request):
        pass

    async def stream(self, request):
        pass
```

---

# Provider Modules

```text id="u09l3v"
/providers
│
├── openai
├── anthropic
├── gemini
├── deepseek
├── openrouter
├── ollama
└── lmstudio
```

---

# Dynamic Routing

## Example

```yaml id="17xt3d"
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

# 8. Tool Architecture

# Philosophy

Semua kemampuan agent adalah tools.

---

# Tool Flow

```text id="h5jqbd"
Agent
  ↓
Tool Registry
  ↓
Permission Check
  ↓
Tool Executor
  ↓
Sandbox
```

---

# Tool Categories

| Tool       | Function          |
| ---------- | ----------------- |
| FileTool   | Read/write/search |
| DockerTool | Build/run/logs    |
| ShellTool  | Safe commands     |
| GitTool    | Git operations    |
| LogsTool   | Analyze logs      |
| HttpTool   | API requests      |

---

# Tool SDK Structure

```text id="qg8ys8"
/packages/tool-sdk
│
├── base
├── registry
├── permissions
├── sandbox
└── builtins
```

---

# 9. Execution Architecture

# Goal

Safe isolated runtime.

---

# Runtime Engine

Docker.

---

# Container Strategy

## One Project = One Container

```text id="a0bfw7"
project-a
 ├── backend
 ├── logs
 └── container

project-b
 ├── frontend
 ├── logs
 └── container
```

---

# Execution Flow

```text id="g85w5v"
Agent Task
   ↓
Tool Call
   ↓
Docker Runtime
   ↓
Container Execution
   ↓
Logs Stream
   ↓
Result
```

---

# Isolation Policies

| Restriction      | Status  |
| ---------------- | ------- |
| privileged mode  | blocked |
| host network     | blocked |
| raw disk access  | blocked |
| arbitrary mounts | blocked |

---

# 10. Memory Architecture

# Short-Term Memory

Conversation/session.

Stored in:

* PostgreSQL
* Redis cache

---

# Long-Term Memory (Future)

## Vector Memory

Store:

* logs
* patches
* fixes
* architecture patterns

---

# Memory Flow

```text id="lnr8c1"
Execution
   ↓
Summarization
   ↓
Embedding
   ↓
Vector Store
```

---

# 11. Workflow Engine Architecture

# Objective

Reusable automation flows.

---

# Workflow Structure

```yaml id="dt0g2t"
name: backend_fix

steps:
  - analyze_logs
  - inspect_files
  - generate_patch
  - run_tests
  - restart_container
```

---

# Workflow Engine Components

| Component     | Purpose         |
| ------------- | --------------- |
| Parser        | Read workflow   |
| Executor      | Run steps       |
| State Manager | Track progress  |
| Retry Engine  | Handle failures |

---

# 12. Queue & Async Architecture

# Stack

* Redis
* Celery / Dramatiq

---

# Queued Jobs

| Job            | Purpose          |
| -------------- | ---------------- |
| execution jobs | long tasks       |
| summarization  | compress context |
| indexing       | embeddings       |
| retry tasks    | recovery         |
| deployment     | async deploy     |

---

# 13. Event-Driven Architecture

# Event Types

```text id="rnn8ta"
execution.started
execution.finished
tool.executed
container.crashed
workflow.failed
model.timeout
```

---

# Benefits

* decoupled modules
* observability
* scalability
* future distributed workers

---

# 14. WebSocket Architecture

# Channels

```text id="2j4lmr"
/ws/chat
/ws/logs
/ws/execution
/ws/container
```

---

# Streaming Features

| Feature           | Type     |
| ----------------- | -------- |
| token streaming   | realtime |
| logs streaming    | realtime |
| execution status  | realtime |
| container metrics | realtime |

---

# 15. Security Architecture

# Layers

```text id="8nsm67"
User
 ↓
API Auth
 ↓
Permission Layer
 ↓
Tool Guardrails
 ↓
Sandbox
 ↓
Docker Isolation
```

---

# Security Modules

| Module                | Purpose          |
| --------------------- | ---------------- |
| RBAC                  | access control   |
| Command Validator     | safe commands    |
| Filesystem Restrictor | path control     |
| Audit Logger          | traceability     |
| Rate Limiter          | abuse prevention |

---

# 16. Observability Architecture

# Metrics

| Metric             | Source           |
| ------------------ | ---------------- |
| token usage        | provider layer   |
| execution duration | execution engine |
| container health   | docker runtime   |
| retry count        | recovery manager |

---

# Logging Stack

## MVP

* structured JSON logs

## Future

* Loki
* OpenTelemetry
* Grafana

---

# 17. Deployment Architecture

# Local Mode

```text id="s3rcr8"
Web UI
  ↓
FastAPI
  ↓
Docker Local
```

---

# Hybrid Mode

```text id="uxr08x"
Local UI
  ↓
Remote Execution Node
  ↓
Docker Runtime
```

---

# Cloud Mode

```text id="5k9w93"
Load Balancer
    ↓
API Cluster
    ↓
Worker Nodes
    ↓
Container Runtime
```

---

# 18. Scalability Roadmap

# MVP

Single-machine monolith.

---

# Phase 2

Split:

* worker
* websocket
* execution runtime

---

# Phase 3

Distributed execution cluster.

---

# Phase 4

Kubernetes orchestration.

---

# 19. Future Architecture Directions

## Multi-Agent System

Specialized agents:

* planner
* coder
* debugger
* reviewer
* deployer

---

## Self-Healing Runtime

```text id="8j2r7v"
Error Detection
    ↓
Root Cause Analysis
    ↓
Patch Generation
    ↓
Validation
    ↓
Redeploy
```

---

# 20. Recommended MVP Architecture

## Keep Simple First

### Include

✅ FastAPI monolith
✅ React frontend
✅ Docker execution
✅ Redis queue
✅ PostgreSQL
✅ Multi-provider API abstraction
✅ WebSocket logs

---

## Avoid Early

❌ Kubernetes
❌ Multi-agent orchestration
❌ Distributed execution
❌ Complex memory systems
❌ Autonomous deployments

---

# 21. Final Architecture Goal

AgentForge berkembang menjadi:

> “AI-native software execution operating system.”

Yang mampu:

* memahami project,
* menjalankan software lifecycle,
* memperbaiki error,
* mengelola infrastructure,
* dan beroperasi semi-autonomous

dengan:

* secure sandboxing,
* modular orchestration,
* provider-agnostic intelligence,
* dan scalable execution runtime.
