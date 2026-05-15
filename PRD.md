# PRD — Local-First AI Agent Platform (Cloud LLM Orchestrator)

## 1. Product Overview

### Product Name

**AgentForge** *(working title)*

### Vision

Membangun platform AI Agent local-first yang mampu:

* membuat project,
* menjalankan command,
* mengelola container,
* melakukan reasoning multi-step,
* dan deploy project,

menggunakan natural language dengan model AI yang dapat dipilih secara fleksibel (OpenAI, Anthropic, Gemini, Ollama, OpenRouter, DeepSeek, dll).

Fokus utama:

> “AI Software Operator yang aman, extensible, dan dapat berjalan di local maupun cloud.”

---

# 2. Core Problem

Developer saat ini menghadapi masalah:

### Development Workflow Chaos

* terlalu banyak tools
* setup environment rumit
* switching context tinggi
* manual Docker operations
* repetitive CRUD & infra setup

### Existing AI Tools Limitations

Copilot / Cursor:

* hanya membantu coding
* tidak menjalankan sistem penuh
* tidak orchestration-aware
* tidak mengelola container/project lifecycle

AI agent cloud:

* data/privacy concern
* mahal
* sulit dikontrol
* tidak local-first

---

# 3. Product Goals

## Primary Goals

Platform dapat:

1. membuat project dari prompt
2. menjalankan project dalam isolated container
3. membaca/edit file
4. menjalankan command aman
5. memilih model AI per task
6. mendukung multi-provider LLM
7. extensible via tools/plugins
8. local-first tetapi cloud-capable

---

# 4. Target Users

## Primary

### AI Engineer / Indie Hacker

Butuh:

* bootstrap cepat
* infra automation
* AI coding assistant lebih powerful

## Secondary

### DevOps / Backend Engineer

Butuh:

* automation
* isolated execution
* deployment workflow

## Future

### Non-technical builders

Natural-language software creation.

---

# 5. Product Principles

## Local First

Semua project & data tetap lokal secara default.

## Provider Agnostic

Tidak terkunci ke satu model/provider.

## Isolation by Default

Semua project berjalan di container terpisah.

## Guardrails First

AI tidak boleh bebas menjalankan command berbahaya.

## Extensible

Semua tools dapat ditambah.

---

# 6. High Level Architecture

## Main Components

### 1. Web UI

Frontend dashboard untuk:

* chat dengan agent
* manage projects
* monitor logs
* pilih model/provider
* configure tools

Tech:

* React / Next.js

---

### 2. API Layer

FastAPI backend.

Responsibilities:

* auth
* routing
* orchestration
* websocket logs
* provider abstraction

---

### 3. Agent Core

Brain system.

Modules:

* planner
* tool selector
* memory/context manager
* reasoning loop
* retry/self-healing
* execution policy

---

### 4. Tool Layer

Tools abstraction system.

Initial tools:

* File tools
* Docker tools
* Terminal tools
* Git tools
* Project CRUD
* Logs reader

Future:

* Browser automation
* SSH
* Kubernetes
* Cloud deploy
* CI/CD

---

### 5. LLM Provider Layer

Abstraction untuk multi-model.

Supported:

* OpenAI
* Anthropic
* Gemini
* OpenRouter
* DeepSeek API
* Groq
* Ollama local
* LM Studio
* Custom OpenAI-compatible API

---

### 6. Execution Layer

Docker-based sandbox execution.

Per-project:

* isolated filesystem
* isolated dependencies
* isolated runtime

---

# 7. Key Differentiator

## Dynamic Model Routing

System dapat memilih model berbeda berdasarkan task.

Contoh:

| Task              | Model            |
| ----------------- | ---------------- |
| Simple CRUD       | cheap fast model |
| Complex debugging | Claude Opus      |
| Refactor          | GPT-5            |
| Long-context logs | Gemini           |
| Code generation   | DeepSeek Coder   |

---

# 8. Core Features (MVP)

# A. AI Chat Workspace

User dapat:

* chat dengan AI
* attach project
* pilih model
* pilih workflow

Features:

* streaming response
* chat history
* context persistence

---

# B. Project Manager

CRUD project:

* create
* open
* clone
* archive
* delete

Project metadata:

* framework
* runtime
* ports
* model preference

---

# C. Docker Execution

Agent dapat:

* build image
* run container
* stop
* restart
* logs

Restriction:

* whitelist commands
* timeout
* CPU/RAM limit

---

# D. File System Tools

AI dapat:

* read file
* write file
* edit partial
* search codebase

---

# E. Multi-Provider LLM System

## Web UI Features

User dapat:

* tambah API key
* pilih provider
* pilih model
* assign model per workflow

Contoh:

```yaml
Planning:
  provider: anthropic
  model: claude-opus

Coding:
  provider: deepseek
  model: deepseek-coder

Summarization:
  provider: openai
  model: gpt-lite
```

---

# F. Workflow System

Preset workflows.

Examples:

* Build App
* Fix Bug
* Refactor
* Analyze Logs
* Create Docker Setup

---

# G. Logs & Observability

Features:

* container logs
* execution history
* token usage
* model latency
* tool execution logs

---

# 9. Advanced Features (Phase 2)

## Self-Healing Loop

Agent dapat:

1. detect error
2. analyze logs
3. patch code
4. rerun tests
5. redeploy

---

## Autonomous Mode

Goal-based execution.

Example:

> “Fix failing backend service.”

Agent runs until:

* success
* timeout
* human approval needed

---

## Multi-Agent Collaboration

Specialized agents:

* planner
* coder
* reviewer
* debugger
* deployer

---

## Memory Engine

Persistent memory:

* previous fixes
* architecture knowledge
* project patterns

---

## Vector Context System

Long-term retrieval:

* logs
* docs
* code embeddings

---

# 10. Guardrails & Security

## Command Restrictions

Whitelist-based execution.

Allowed:

* docker
* git
* npm
* python
* node

Blocked:

* rm -rf /
* shutdown
* privileged docker
* raw host access

---

## Filesystem Isolation

AI hanya dapat mengakses:

```txt
/projects/*
```

---

## Docker Restrictions

Forbidden:

* privileged mode
* host networking
* mounting sensitive dirs

---

## Human Approval Layer

Untuk:

* deploy
* delete
* external API changes
* cost-heavy tasks

---

# 11. System Flow

## Example Flow

### User Input

> “Create FastAPI auth backend.”

↓

### Planner

Creates execution steps.

↓

### Model Router

Chooses:

* planning model
* coding model

↓

### Tool Execution

* create files
* generate Dockerfile
* install deps

↓

### Docker Execution

Build & run project.

↓

### Result

Return:

* logs
* preview
* endpoints

---

# 12. Suggested Tech Stack

| Layer         | Stack               |
| ------------- | ------------------- |
| Frontend      | Next.js             |
| Backend       | FastAPI             |
| Agent Runtime | Python              |
| Container     | Docker              |
| Queue         | Redis               |
| DB            | PostgreSQL          |
| Vector DB     | Qdrant              |
| Realtime      | WebSocket           |
| Auth          | JWT                 |
| AI SDK        | LiteLLM / LangChain |
| Deployment    | Docker Compose      |

---

# 13. Database Design (Simplified)

## Tables

### users

* id
* email
* settings

### projects

* id
* name
* runtime
* path

### executions

* id
* project_id
* status
* logs

### providers

* id
* provider
* encrypted_api_key

### workflows

* id
* config_json

---

# 14. API Examples

## Chat

```http
POST /agent/prompt
```

## Create Project

```http
POST /projects
```

## Run Container

```http
POST /projects/{id}/run
```

## Stream Logs

```http
GET /projects/{id}/logs
```

---

# 15. Deployment Modes

## Mode A — Fully Local

* local docker
* local filesystem
* external cloud LLM APIs

## Mode B — Hybrid

* local agent
* remote execution node

## Mode C — VPS Hosted

* remote multi-user system

---

# 16. Monetization Ideas

## Open Source Core

Free self-hosted version.

## Paid Features

* cloud sync
* team workspace
* hosted execution
* premium workflows
* enterprise guardrails

---

# 17. Risks

| Risk                | Mitigation         |
| ------------------- | ------------------ |
| runaway token cost  | budget limiter     |
| infinite loops      | max iterations     |
| dangerous commands  | whitelist          |
| model hallucination | verification layer |
| docker abuse        | isolated runtime   |

---

# 18. Success Metrics

## Technical

* task completion rate
* execution success %
* retry rate
* hallucination rate

## Business

* daily active projects
* retained users
* API usage
* workflow reuse

---

# 19. Future Vision

Long-term target:

> “Local autonomous software engineer platform.”

Bukan sekadar chatbot coding, tetapi:

* planner
* executor
* debugger
* infra operator
* deployment orchestrator
* self-healing runtime system

dengan:

* local control
* cloud intelligence
* modular AI routing
* secure execution sandbox.
