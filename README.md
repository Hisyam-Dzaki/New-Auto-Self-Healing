# AgentForge

Local-first AI Agent Platform for autonomous software development and operations.

## Features

- 🤖 Multi-provider LLM support (OpenAI, Anthropic, Gemini, DeepSeek, Ollama)
- 🐳 Docker-based isolated execution
- 🔧 Extensible tool system
- 🔄 Workflow automation
- 📊 Real-time logs and observability
- 🔒 Security-first design with guardrails

## Architecture

```
┌─────────────┐
│   Web UI    │ (Next.js)
└──────┬──────┘
       │
┌──────▼──────┐
│  API Layer  │ (FastAPI)
└──────┬──────┘
       │
┌──────▼──────┐
│ Agent Core  │ (Planner, Router, Memory)
└──────┬──────┘
       │
┌──────▼──────┐
│ Tool Layer  │ (File, Docker, Git, Shell)
└──────┬──────┘
       │
┌──────▼──────┐
│  Execution  │ (Docker Runtime)
└─────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 20+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Hisyam-Dzaki/New-Auto-Self-Healing.git
cd New-Auto-Self-Healing
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure API keys in `.env`:
```env
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

4. Start services:
```bash
docker-compose up -d
```

5. Access the application:
- Web UI: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
/
├── src/
│   ├── agent/          # Agent core logic
│   ├── api/            # FastAPI routes
│   ├── providers/      # LLM providers
│   ├── tools/          # Tool implementations
│   ├── execution/      # Docker execution
│   ├── models/         # Database models
│   └── main.py         # API entry point
├── docker/
│   ├── Dockerfile      # API container
│   └── Dockerfile.web  # Web UI container
├── projects/           # User projects
├── data/               # Application data
└── docker-compose.yml
```

## Core Features

### 1. AI Chat Workspace
- Natural language interaction
- Streaming responses
- Context-aware conversations

### 2. Project Management
- Create, manage, and delete projects
- Runtime and framework detection
- Container lifecycle management

### 3. Multi-Provider LLM
- Dynamic model routing
- Provider abstraction
- Cost and latency optimization

### 4. Docker Execution
- Isolated project containers
- Resource limits (CPU, RAM)
- Safe command execution

### 5. Tool System
- File operations (read, write, search)
- Docker control
- Git operations
- Shell commands (whitelisted)

### 6. Workflow Engine
- Preset workflows (build, debug, refactor)
- Custom workflow creation
- Step-by-step execution

### 7. Observability
- Execution logs
- Token usage tracking
- Performance metrics

## Security

- Command whitelist enforcement
- Filesystem isolation (`/projects/*` only)
- Docker restrictions (no privileged mode)
- Resource limits per container
- API key encryption

## Development

### Backend Development

```bash
cd src
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
npm install
npm run dev
```

### Database Migrations

```bash
alembic upgrade head
```

## Configuration

### Agent Configuration

Edit `config.yml`:

```yaml
agent:
  default_provider: openai
  default_model: gpt-4

docker:
  cpu_limit: 2
  memory_limit: 4g
  timeout: 600

security:
  allowed_commands:
    - git
    - npm
    - python
    - docker
```

### Model Routing

Configure per-task model selection:

```yaml
routing:
  planning:
    provider: anthropic
    model: claude-opus
  
  coding:
    provider: deepseek
    model: deepseek-coder
  
  summarization:
    provider: openai
    model: gpt-3.5-turbo
```

## API Documentation

### Chat Endpoint

```http
POST /api/agent/prompt
Content-Type: application/json

{
  "message": "Create a FastAPI backend",
  "projectId": "uuid",
  "model": "gpt-4",
  "workflow": "build-app"
}
```

### Project Management

```http
POST /api/projects
GET /api/projects
GET /api/projects/{id}
DELETE /api/projects/{id}
```

### Container Control

```http
POST /api/containers/{project_id}/build
POST /api/containers/{project_id}/run
POST /api/containers/{project_id}/stop
GET /api/containers/{project_id}/logs
```

## Roadmap

### Phase 1 (MVP) ✅
- [x] Multi-provider LLM
- [x] Docker execution
- [x] Basic tools
- [x] Chat interface

### Phase 2
- [ ] Self-healing system
- [ ] Vector memory
- [ ] Advanced workflows
- [ ] Multi-agent collaboration

### Phase 3
- [ ] Kubernetes support
- [ ] Distributed execution
- [ ] Plugin marketplace
- [ ] Enterprise features

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT License

## Documentation

- [PRD](./PRD.md) - Product Requirements
- [TRD](./TRD.md) - Technical Requirements
- [Architecture](./Project_Architecture.md) - System Architecture
- [ERD](./ERD.md) - Database Schema
- [Agent Skills](./Agent_Skills.md) - Agent Capabilities

## Support

- GitHub Issues: https://github.com/Hisyam-Dzaki/New-Auto-Self-Healing/issues
- Documentation: Coming soon

---

Built with ❤️ for autonomous software development