# AgentForge - Single Device Self-Healing System

## Architecture

```
┌─────────────────────────────────────────────────┐
│           SINGLE DEVICE DEPLOYMENT              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   API    │  │  Worker  │  │   Web    │    │
│  │  :8000   │  │ (async)  │  │  :3000   │    │
│  └────┬─────┘  └────┬─────┘  └──────────┘    │
│       │             │                          │
│  ┌────▼─────────────▼─────┐  ┌──────────┐    │
│  │       Redis            │  │ Ollama   │    │
│  │  Queue/Cache/State     │  │ :11434   │    │
│  └────────────────────────┘  └──────────┘    │
│                                                 │
│  ┌──────────┐  ┌──────────┐                   │
│  │ Postgres │  │  Docker  │                   │
│  │  :5432   │  │  Socket  │                   │
│  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────┘
```

## Self-Healing Flow

```
EVENT DETECTED
    ↓
COLLECT LOGS
    ↓
CLASSIFY ERROR (LogAnalyzer)
    ↓
CHECK CACHE (Redis)
    ↓
ATTEMPT 1: Deterministic Fix
    ├─ restart service
    ├─ clear cache
    ├─ cleanup disk
    └─ kill zombies
    ↓
ATTEMPT 2: Local AI (Ollama)
    └─ codellama:7b
    ↓
ATTEMPT 3: Cloud AI (9Router/Claude)
    └─ anthropic/claude-3.5-sonnet
    ↓
DEPLOY FIX
    ↓
VERIFY HEALTH
    ↓
SUCCESS or ROLLBACK
```

## Worker Modes

The worker runs 4 concurrent loops:

1. **Monitor Loop** (30s interval)
   - Check CPU, RAM, disk
   - Detect anomalies
   - Push issues to queue

2. **Process Loop** (continuous)
   - Pop tasks from queue
   - Lock task
   - Execute healing
   - Retry or deadletter

3. **Retry Loop** (10s interval)
   - Process retry queue
   - Re-queue with delay

4. **Cleanup Loop** (1h interval)
   - Disk cleanup
   - Log rotation

## API Endpoints

### Healing
- `POST /api/heal/trigger` - Manual trigger
- `GET /api/heal/status/{task_id}` - Task status
- `GET /api/worker/status` - Worker health

### Monitoring
- `GET /api/monitor/resources` - CPU/RAM/Disk
- `GET /api/monitor/docker` - Container stats

### Queue
- `GET /api/queue/status` - Queue sizes
- `GET /api/queue/deadletter` - Failed tasks
- `POST /api/queue/clear/{queue}` - Clear queue

### Analysis
- `POST /api/analyze/logs` - Classify logs

## Redis Structure

```
Queues:
  queue:incoming      - New tasks
  queue:processing    - Active tasks
  queue:retry         - Failed tasks (retry)
  queue:deadletter    - Max retries exceeded

Locks:
  lock:task:{id}      - Task execution lock

Cache:
  cache:fix:{sig}     - Cached fixes

State:
  state:worker        - Worker status
  state:service       - Service health
  state:task:{id}     - Task result
```

## Retry Policy

| Attempt | Method | Model | Timeout |
|---------|--------|-------|---------|
| 1 | Deterministic | - | 30s |
| 2 | Local AI | codellama:7b | 60s |
| 3 | Cloud AI | claude-3.5-sonnet | 120s |
| 4 | Deadletter | - | - |

## Resource Limits

```yaml
RAM: < 8GB total
  - API: 512MB
  - Worker: 1GB
  - Ollama: 4GB
  - Redis: 2GB
  - Postgres: 512MB

CPU: Avoid 100% continuous
  - Use cooldowns
  - Monitor spikes

Disk:
  - Rotate logs daily
  - Cleanup temp files
  - Alert at 90%
```

## Supported Issues

- Container crash
- API timeout
- Memory leak
- CPU spike
- Disk full
- Redis unavailable
- Missing dependency
- Broken config
- Health check fail
- Infinite restart loop
- Queue stuck
- Process deadlock

## Quick Start

```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env with your API keys

# 2. Start all services
docker-compose up -d

# 3. Pull Ollama model (first time)
docker exec -it agentforge-ollama ollama pull codellama:7b

# 4. Check worker status
curl http://localhost:8000/api/worker/status

# 5. Trigger manual healing
curl -X POST http://localhost:8000/api/heal/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "service": "api",
    "logs": "Error: Connection refused",
    "severity": "high"
  }'
```

## Monitoring

```bash
# Resource metrics
curl http://localhost:8000/api/monitor/resources

# Docker stats
curl http://localhost:8000/api/monitor/docker

# Queue status
curl http://localhost:8000/api/queue/status

# Deadletter tasks
curl http://localhost:8000/api/queue/deadletter
```

## Safety Guardrails

**NEVER:**
- Delete entire project
- Run `rm -rf` blindly
- Expose secrets
- Deploy untested patches
- Disable security

**ALWAYS:**
- Backup before patch
- Validate syntax
- Run tests
- Use rollback
- Log all actions

## Technology Stack

- **API**: FastAPI
- **Worker**: AsyncIO (no Celery)
- **Queue**: Redis
- **Local AI**: Ollama (codellama:7b)
- **Cloud AI**: 9Router → Claude/GPT
- **DB**: PostgreSQL
- **Containers**: Docker Compose

## Philosophy

- **Local First**: Try local fixes before cloud AI
- **Simple**: No Kubernetes, no distributed systems
- **Cheap**: Minimize cloud API calls
- **Safe**: Rollback on failure
- **Observable**: Log everything
- **Autonomous**: Minimal human intervention

## Logs

```bash
# API logs
docker logs agentforge-api-1 -f

# Worker logs
docker logs agentforge-worker-1 -f

# Ollama logs
docker logs agentforge-ollama-1 -f
```

## Troubleshooting

### Worker not starting
```bash
docker logs agentforge-worker-1
# Check Redis connection
docker exec -it agentforge-redis-1 redis-cli ping
```

### Ollama not responding
```bash
# Pull model manually
docker exec -it agentforge-ollama-1 ollama pull codellama:7b

# Check Ollama health
curl http://localhost:11434/api/tags
```

### Queue stuck
```bash
# Clear all queues
curl -X POST http://localhost:8000/api/queue/clear/incoming
curl -X POST http://localhost:8000/api/queue/clear/retry
```

## Performance

Expected resource usage:
- Idle: ~2GB RAM, <10% CPU
- Active healing: ~6GB RAM, 30-60% CPU
- Peak (Ollama inference): ~8GB RAM, 80% CPU

## License

MIT