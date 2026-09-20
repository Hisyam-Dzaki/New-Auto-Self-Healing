# AgentForge → Orchestrator Product: Analysis & Roadmap

**Written:** 2026-07-19
**Scope of this doc:** (1) what the codebase actually does today, (2) gap analysis toward an "orchestrator watching external workers" architecture, (3) a concrete plan to turn this into a sellable product, (4) a first-week todo list.

This document assumes zero prior context — it's meant to be portable to other conversations.

---

## 0. Branch situation (analyzed first, since it changes what "current state" means)

```
git branch --merged HEAD   → everything except feature/ui-skeleton
git branch --no-merged HEAD → feature/ui-skeleton only
main..HEAD                  → 28 commits (this branch is 28 commits ahead of main, 0 behind)
```

- You are on **`feature/react-vite-migration`**. Every other feature branch (`logs-observability`, `workflow-system`, `multi-provider-llm`, `file-system-tools`, `docker-execution`, `project-manager`, `projects-and-self-healing`, `dark-light-mode-and-settings`, `ai-chat-workspace`) is **already merged into this branch**. This branch is the superset — nothing important is hiding in an unmerged branch.
- The one exception: **`feature/ui-skeleton`** has 1 unique commit (151 lines: `Dashboard.tsx`, `ProjectList.tsx`, `Settings.tsx` under `src/web_ui/`). These are early stub components superseded by the full `app/*.tsx` pages that already exist on your current branch. Safe to ignore/delete later.
- **`main` is 28 commits behind your working branch.** Practically: the "real" state of the project lives on `feature/react-vite-migration`, not `main`. You should merge this branch into `main` once it's stable — right now anyone looking at `main` sees a stale, much smaller project.

---

## 1. What this system actually does today

### 1.1 Identity crisis (important, read this first)

The repo currently contains **two different products glued together**:

1. **"AgentForge" self-healing infra system** — a FastAPI + Redis + Postgres + Docker worker that detects and auto-fixes infrastructure problems (crashes, resource spikes, disk full, etc.) using a 3-tier escalation: deterministic fix → local AI (Ollama) → cloud AI (Claude/GPT via 9Router).
2. **"AI Company Simulation"** — an HR/department/agent/task-queue/office-visualization layer (`app/hr`, `app/office`, `app/agents`, `app/budget`, `app/templates`, `src/company/*`) that simulates a virtual company of AI agents doing work, with a pixel-art isometric office UI.

The FastAPI app title is literally `"AgentForge API - AI Company Simulation"` (`src/main.py:6`) — these two ideas are currently one codebase. **This matters for your product plan (see §3.3) — you need to explicitly decide whether the sellable product is the orchestrator alone, or bundled with the company-sim layer.** They have different buyers and different levels of maturity.

This document focuses on **part 1** (the self-healing/orchestrator engine), since that's what you asked to productize.

### 1.2 Architecture (self-healing engine)

```
┌─────────────────────────────────────────────┐
│              SINGLE DEVICE / HOST            │
│                                               │
│  API (FastAPI :8000→8888)  Worker (asyncio)  │
│         │                        │           │
│         └──────────┬─────────────┘           │
│                 Redis (queue/cache/state)     │
│                 Postgres (schema exists,      │
│                           NOT wired up — see  │
│                           §1.5)               │
│  Web (React 19 + Vite, :3000→3006)            │
│  Docker socket mounted into API container     │
│    (/var/run/docker.sock)                     │
└─────────────────────────────────────────────┘
```

Services (`docker-compose.yml`):
- `api` — FastAPI, port 8888→8000, has `/var/run/docker.sock` mounted (so it CAN control any container on the host, not just its own)
- `web` — React frontend, port 3006→3000
- `postgres` — provisioned but unused by application code (see §1.5)
- `redis` — the actual state/queue backend, `maxmemory 2gb`, LRU eviction
- `ollama` — present but commented out in compose (local AI tier is currently non-functional unless you run Ollama separately)

### 1.3 What is monitored today

- **Its own host's resources**: CPU, memory, disk via `psutil` (`src/worker/resource_monitor.py`). Thresholds: CPU 90%, memory 85%, disk 90%, plus a naive anomaly detector (current sample > 1.5x / 1.3x the trailing 10-sample average).
- **All Docker containers on the same host** — `ResourceMonitor.get_docker_stats()` calls `docker.from_env()` and lists **every** container on the machine (not just itself), returning per-container CPU%/memory%. This is exposed via `GET /api/monitor/docker`. **This is already a multi-container capability** — it's just not wired into the automated healing decision loop (see gap #1 below).
- **External projects/servers** — `POST /api/heal/receive` (`src/api/healing.py:183`) already accepts logs pushed from an external source (`source: "external"`, e.g. a VPS or webhook), tags them to a `project_id`, classifies them, and queues a healing task. **This is the seed of the orchestrator pattern you're asking for** — an external worker can already push "I'm sick" signals into this system today, over HTTP, no polling needed.

### 1.4 Self-healing mechanism

Escalation ladder per task, keyed by `retry_count` (`src/worker/self_healing_engine.py`):

| Attempt | Method | What happens |
|---|---|---|
| 1 | Deterministic | Pattern-matched fix: restart container, clear Redis cache, cleanup disk, kill zombie processes — no AI call |
| 2 | Local AI | Ollama `codellama:7b` proposes a fix (currently broken — Ollama service is commented out in compose) |
| 3 | Cloud AI | Claude 3.5 Sonnet (via Anthropic directly, or 9Router) analyzes and proposes root cause + fix + rollback plan |
| 4 | Deadletter | Give up, task goes to `queue:deadletter` for human review |

Fixes are **cached by a hash of `(issue_type, log_content[:500])`** in Redis, so an identical recurring failure skips straight to the cached fix instead of re-escalating — this is the main cost-control mechanism that already exists for the AI tiers.

The **worker** (`src/worker/worker.py`) runs 4 concurrent asyncio loops:
- `_monitor_loop` (every 30s): checks host health, pushes issues to queue
- `_process_queue_loop`: pulls tasks, locks them (Redis lock, 300s TTL, prevents double-processing), routes to healing engine
- `_retry_loop` (every 10s): re-queues retryable tasks
- `_cleanup_loop` (hourly): disk cleanup

**Important limitation:** an important chunk of "AI decision" calls in `_attempt_cloud_ai_fix` only *return analysis text* — they don't actually execute the fix. The pipeline analyzes and recommends; there's no code path shown that automatically applies an LLM-proposed remediation to a container. Deterministic fixes (tier 1) are the only tier that's fully closed-loop today.

**Alerting**: none. Confirmed by grep across `src/` and `.env.example` — no Telegram, Slack, webhook-out, or email code anywhere. The system detects and (sometimes) fixes, but never notifies a human.

### 1.5 Critical finding: Postgres is provisioned but never used

`src/models/database.py` defines a full SQLAlchemy schema (`User`, `Provider`, `Project`, `Execution`, `ExecutionLog`, `Container`, `ChatSession`, `ChatMessage`) — this looks like it was designed for exactly the kind of durable, multi-project state a real product needs.

**But nothing imports it.** Grep for `models.database`, `create_engine`, `sessionmaker`, `asyncpg` across `src/` returns zero hits. `src/main.py` never initializes a DB connection.

In practice, `projects_db = []` and `healing_history = []` (`src/api/projects.py`, `src/api/healing.py`) are **plain Python lists living in FastAPI process memory**. This means:
- Every project you register, every healing history entry — **gone on container restart**.
- The `docker-compose.yml` `DATABASE_URL` env var is set and Postgres runs, entirely decoratively.

This is the single most important gap to close before this can be a real product — see §2.

### 1.6 LLM routing

`src/providers/llm_router.py` supports OpenAI, Anthropic, Gemini, DeepSeek, Ollama, OpenRouter, 9Router (a routing proxy), Groq, LM Studio — selected by model-name prefix matching, provider chosen from whichever `*_API_KEY` env vars are present. This is solid and already provider-agnostic; no changes needed for your "call Claude only for high-value decisions" goal — you just need to *decide when to call it*, which is a worker-loop change, not a provider-layer change (see §2.4).

### 1.7 Frontend

React 19 + Vite (migrated from Next.js recently — `fc2b564`, `c06a699`). Pages include: Projects, Self-Healing, GitHub, Templates, HR, Office (isometric pixel-art), Budget, Analytics, Chat, Agents, Settings, Tasks. The self-healing/monitoring UI (`SelfHealing.tsx`, `GitHub.tsx`) exists but is themed around *this system's own* healing activity, not a multi-tenant "fleet of worker containers" dashboard.

---

## 2. Orchestrator gap analysis

### What's already orchestrator-shaped
| Capability | Status |
|---|---|
| Ingest external failure signals over HTTP (`/api/heal/receive`) | ✅ exists |
| Classify + prioritize incoming issues | ✅ exists (`LogAnalyzer`) |
| Query stats for *any* container on the host, not just self | ✅ exists (`get_docker_stats`) |
| Multi-provider LLM routing incl. Claude | ✅ exists |
| Cost control via fix-caching | ✅ exists (Redis-keyed) |
| Queue with retry/backoff/deadletter | ✅ exists |
| Decision escalation ladder (deterministic → local AI → cloud AI) | ✅ exists (pattern established, reusable for cross-container decisions) |

### What needs to be built
1. **Wire `get_docker_stats()` into the monitor loop for *all* containers, not just self-metrics.** Today `_monitor_loop` only calls `resource_monitor.check_health()` (host CPU/mem/disk). It never iterates `get_docker_stats()` results to raise per-container issues automatically. This is a small, high-leverage change — the primitive already exists, it's just not called from the loop that generates tasks.
2. **Real persistence.** Wire `src/models/database.py` into `main.py` (SQLAlchemy async engine + session), replace `projects_db`/`healing_history` in-memory lists with real queries against Postgres. Without this, "shared state" isn't shared — it's ephemeral. This is the top-priority infra item, independent of the product pivot.
3. **A worker registration/heartbeat model.** Right now, external signals arrive ad hoc via `/heal/receive`, tied to a `project_id` that must already exist in `projects_db`. There's no concept of "register this worker container, tell me its expected heartbeat interval, alert me if it goes silent." You need: a `workers`/`agents` table (extends the existing `Container` model), a heartbeat endpoint, and a "missed heartbeat" detector in the monitor loop.
4. **Outbound alerting.** Nothing sends anything to a human. Add a Telegram bot (simplest: `python-telegram-bot` or raw `httpx` POST to the Bot API) and/or generic outbound webhook config per user/workspace. Trigger on: healing failure reaching deadletter, worker heartbeat missed, critical severity issue detected. Keep it periodic/digest-based (e.g. every N minutes) plus immediate for `critical` severity, so it doesn't spam.
5. **Gate Claude calls behind a real decision boundary, not per-loop-iteration.** The retry-tier structure (`retry_count == 2` → cloud AI) already avoids calling Claude on every 30s tick — that's good and already cost-conscious. What's missing for a *multi-worker* orchestrator: a policy of "only call Claude when (a) it's a new, uncached failure signature, AND (b) severity ≥ high, AND (c) deterministic/local tiers already failed." Mostly a matter of tightening the existing escalation conditions and applying them per external worker, not just per internal service.
6. **Multi-tenancy / auth.** `User` table exists in the schema but there is no auth middleware, no login, no per-user scoping of projects — `CORSMiddleware` is wide open (`allow_origins=["*"]`). Required before this can be a hosted SaaS product where customer A can't see customer B's containers.
7. **A worker-fleet dashboard.** The current `SelfHealing.tsx`/`GitHub.tsx` frontend pages are built around this system healing itself. A sellable orchestrator needs a dashboard listing N registered workers, their last-heartbeat, health status, and healing history — a straightforward extension of existing patterns, not a rewrite.

---

## 3. Turning this into a sellable product

### 3.1 Target buyer

**Solo developers / indie hackers running several small containerized services (content engine, trading bot, market scanner, etc.) without a DevOps team.** This matches your own stated use case exactly, which is a good sign — you're building for yourself first. Realistic buyer profile: someone running 3–15 containers across 1–3 VPS boxes, currently doing "restart it and hope" manually or with cron + shell scripts, who wants (a) to stop getting paged by their own pager-less setup at 3am, and (b) not to pay for a full observability stack (Datadog/Grafana Cloud) sized for teams, not solo operators.

This is **not** infra-team-scale (they already have PagerDuty/Datadog) and **not** enterprise (compliance/SSO requirements you don't have). Aim narrow.

### 3.2 Business model

Given the buyer (solo devs, cost-sensitive, technical enough to self-host):

- **Recommended: self-hosted, paid license (one-time or annual) + optional managed/cloud tier later.** Your buyer already runs Docker; asking them to `docker-compose up` your orchestrator next to their other containers is a natural fit, and self-hosting avoids you needing to operate multi-tenant infra (auth, isolation, billing infra) before you've validated anyone wants this.
- A **hosted SaaS tier** is a good v2, not v1 — it requires solving multi-tenancy (§2, gap 6) and hosting costs for something that inherently needs `docker.sock` access to the customer's machines (harder to offer as pure SaaS; more realistically "agent runs on their box, reports to your hosted dashboard" — a hybrid, which is itself extra work).
- Managed service (you personally operate it for them) doesn't fit a solo-dev buyer's budget or trust model — skip it.

**Suggested v1 pricing shape:** self-hosted license, tiered by number of monitored workers (e.g. free for ≤3 containers, paid tier for more + Telegram/webhook alerting + Claude-tier analysis). This mirrors how the codebase is already structured (per-project, per-container).

### 3.3 Scope decision (do this before writing more code)

**Recommendation: ship the orchestrator alone. Set the AI-company-simulation layer (HR/office/agents/budget/templates) aside entirely for v1.**

Reasons:
- Different buyer, different value prop, different maturity level (the sim layer is UI-heavy and un-battle-tested; the healing engine has real logic and has clearly had more iteration).
- Bundling them muddies your pitch — "self-healing container monitor" and "simulate an AI company with HR" are not the same sentence to a buyer.
- You can always sell the company-sim separately later, or keep it as an unrelated side project.
- Practically: it costs you nothing to leave that code in the repo dormant; you just don't build v1 marketing/features around it, and you don't block v1 shipping on fixing its bugs.

### 3.4 MVP feature list (must-have vs nice-to-have)

**Must-have for v1 (sellable, not just impressive):**
- Real persistence (Postgres wired up) — without this, nothing else is trustworthy
- Worker registration + heartbeat + "went silent" detection
- Cross-container monitoring loop wired to `get_docker_stats()` (gap #1)
- Telegram alerting (simplest outbound channel to build first) on: critical issue detected, healing failed after all tiers, worker heartbeat missed
- Claude-gated decision tier with the escalation policy tightened (gap #5) — this is your headline differentiator ("doesn't just restart blindly, actually reasons about root cause") so it needs to be reliable, not just present
- A working `docker-compose up` quick start that a solo dev can point at their existing containers in under 15 minutes — onboarding friction will kill this product faster than any missing feature
- Basic single-user auth (even just an API key/shared secret) so this isn't wide open on a public VPS

**Nice-to-have (v1.1+):**
- Full multi-tenant SaaS hosting
- Fleet dashboard with historical charts/analytics
- Slack/Discord/PagerDuty alert channels beyond Telegram
- Local AI tier (Ollama) actually working — cost optimization, not core value
- Auto-applying LLM-proposed fixes beyond the deterministic tier (higher risk, needs more trust first)
- The AI-company-simulation layer, if you ever decide to ship it as a separate product

### 3.5 Effort estimate to sellable MVP

Rough sizing given the current codebase quality (backend logic is genuinely more mature than a prototype; frontend just migrated to Vite and is stable):

| Work item | Est. effort |
|---|---|
| Wire Postgres (engine, sessions, migrate `projects_db`/`healing_history` off in-memory lists) | 3–5 days |
| Worker registration + heartbeat model + missed-heartbeat detection | 3–4 days |
| Wire multi-container monitoring into the loop (`get_docker_stats` → task generation) | 1–2 days |
| Telegram alerting (bot setup, digest + immediate-critical logic) | 2–3 days |
| Tighten Claude-gating policy for external workers, test cost behavior under load | 2–3 days |
| Basic auth (API key per install is enough for self-hosted v1) | 1–2 days |
| Onboarding: docs, one-command `docker-compose up`, example worker agent snippet | 2–3 days |
| Fleet dashboard (list of workers, status, last heartbeat, history) — extend existing pages | 3–5 days |
| Buffer / integration testing across the whole loop | 3–5 days |

**Total: roughly 4–6 weeks of focused solo work** to a self-hostable MVP you could put in front of the first 5–10 paying users. This assumes you're not touching the company-sim layer at all (per §3.3) and are working from the current `feature/react-vite-migration` branch (merge it to `main` first — see §0).

---

## 4. This week's todo list

1. **Merge `feature/react-vite-migration` into `main`.** `main` is 28 commits stale; work from a clean, current baseline before adding more. Delete/archive `feature/ui-skeleton` (superseded, unmerged, low value) once confirmed unneeded.
2. **Decide and write down the scope call from §3.3** (orchestrator-only vs bundled) — this determines what you spend hours on for the next month. Recommendation: orchestrator-only.
3. **Wire up Postgres** (§2, gap 2): create the async engine/session in `src/main.py`, replace `projects_db`/`healing_history` in `src/api/projects.py` and `src/api/healing.py` with real DB calls against the existing `Project`/`Execution` models. This unblocks everything else — don't build heartbeat/alerting on top of state that vanishes on restart.
4. **Add a minimal `workers` table + `POST /api/workers/register` and `POST /api/workers/{id}/heartbeat` endpoints.** Reuses the existing `Container` model pattern in `src/models/database.py`.
5. **Extend `_monitor_loop` in `src/worker/worker.py`** to also call `resource_monitor.get_docker_stats()` and raise per-container issues (not just host-level `check_health()`), and to check for workers past their heartbeat deadline.
6. **Build the Telegram alert path**: a small `src/worker/notifier.py` that posts to a bot token/chat ID from env vars, called from the deadletter path and the missed-heartbeat check.
7. **Write a 1-page "how to point an external worker at this" doc** — literally the `curl` payload shape for `/api/heal/receive` and the new heartbeat endpoint, since that's your entire onboarding flow for the trading-bot/content-engine/market-scanner containers you mentioned.

Once items 3–6 are done, you'll have a real end-to-end demo: register your other containers as workers, kill one, watch it get detected, classified, escalated to Claude if needed, and alert you on Telegram — which is both your dogfood setup and your sales demo.

---

## 5. Bundling decision: self-healing as an "IT/Ops department" inside the AI company simulation

**Context:** you've decided against the split recommended in §3.3 — the self-healing engine will ship as one department (e.g. "IT/Ops") inside the AI-company-simulation product, not as a standalone tool. This section investigates what that actually takes, component by component, since §3.3's original recommendation assumed they'd stay separate and never checked whether the company-sim layer has anything real to plug into.

**Bottom line up front:** the company-sim layer (Office/Agents/HR/Budget) is a complete, self-contained simulation with its own in-memory state and zero code-level connection to the self-healing engine. Nothing you see moving in the Office view today is driven by anything real — not container health, not healing tasks, not the worker process. Wiring them together is a well-scoped, buildable feature (not a rewrite), but it needs the same "make state durable" work that §2/§4 already did for projects and healing, applied a second time to the company-sim data model, which currently has no persistence layer at all — not even the broken kind (in-memory Pydantic objects, not backed by Postgres or working Redis).

### 5.1 Component-by-component: real data vs. pure simulation

First, a routing fact that changes what's even "live" here: **`app/hr`, `app/office`, `app/agents`, `app/budget` (the top-level `app/` directory) are dead code.** They're leftover Next.js App Router pages from before the Vite migration (`fc2b564`/`c06a699`). `index.html` loads `/src/main.tsx`, `vite.config.ts` only builds from `src/`, and `src/App.tsx`'s `<Routes>` only imports from `src/pages/*`. Nothing in `app/` is served, built, or reachable in the running app. The real (served) pages are `src/pages/Office.tsx`, `src/pages/Agents.tsx`, `src/pages/HR.tsx`, `src/pages/Budget.tsx` — that's what's analyzed below.

| Component | Talks to | Real or simulated | Detail |
|---|---|---|---|
| `src/pages/Office.tsx` | `GET /api/company/agents` (polled every 5s) | **Simulated** | Agent sprite position is computed client-side from a hardcoded `DEPARTMENT_ROOM_MAP` + `getStatusRoom(behavior)` — a pure function of whatever `behavior` string the agent object currently has. It renders real HTTP response data, but that data itself (see below) is not connected to anything outside the company-sim module. Nothing about container health, Docker stats, or the healing queue reaches this page today. |
| `src/pages/Agents.tsx` | `GET/POST/DELETE /api/company/agents*` | **Real API calls, simulated backend** | The HTTP round-trips are genuine (not mocked in the frontend), but the backend they hit (`company_manager`, see below) holds no data sourced from outside itself — you get back exactly what was manually POSTed through this same UI. |
| `src/pages/HR.tsx` | Same `/api/company/agents`, `/api/company/departments` as Agents.tsx | **Real API calls, simulated backend** | Functionally a re-skin of Agents.tsx over the same endpoints — no unique data source, no link to healing. |
| `src/pages/Budget.tsx` | `GET/PUT /api/company/budgets*` | **Broken, not just simulated** | `src/api/company.py` has no `/budgets` route at all (confirmed by grep — zero matches). Every load of this page hits a 404, `data.budgets` is `undefined`, and the UI silently falls back to an empty list. This isn't mock data — it's a frontend page wired to an endpoint that was never built. |
| `src/company/manager.py` (`company_manager` singleton) | Nothing external | **Pure in-memory simulation, and not durable** | `CompanyManager` is instantiated once at import time (`company_manager = CompanyManager()`, module-level) holding a Pydantic `Company` object in process memory. It best-effort persists to Redis via `redis.Redis(host='localhost', port=6379, ...)` — **hardcoded `localhost`, wrapped in bare `except: pass`**. Inside the `api` Docker container, `localhost` never reaches the `redis` service (this is the exact same bug class as the `RedisQueue` bug fixed earlier in this session, just never fixed here) — so in practice every save/load silently no-ops, and all company/agent/department state is wiped on every `api` container restart. |
| `src/company/task_queue.py` (`task_queue` singleton) | Nothing external | **Same pattern as manager.py** | Independent in-memory `Dict[str, Task]`, same hardcoded-`localhost`-Redis-that-never-connects pattern, same total data loss on restart. This "task" concept (`Task.department`, `TaskPriority`, generic company work items) is entirely separate from the self-healing worker's Redis queue (`queue:incoming` etc.) and from `HealingRecord` — three unrelated task/record systems exist in this codebase today (company tasks, worker queue tasks, healing records), none aware of the others. |
| `src/agents/base.py` | N/A (data models only) | — | Defines the `Agent`/`Department`/`Company` Pydantic shapes. Worth noting: `DepartmentType.OPERATIONS` already exists as an enum value ("Day-to-day operations and logistics") — there's already a natural slot for an "IT/Ops" department without a schema change on this side. `AgentBehavior` already includes `debugging`, `error`, `success`, `working` — states that map naturally onto healing activity without inventing new ones. |

Confirmed by direct grep across `src/company/`: zero references to `healing`, `self_healing`, `Worker`, `worker_status`, or `deadletter`. There is no existing code path, not even a partial or commented-out one, connecting the company-sim layer to the self-healing engine.

### 5.2 Is there a sane technical path to make the "IT/Ops agent" show real healing state?

**Yes — this is buildable, not a rewrite — but there's an architectural fact to work around first: `company_manager` lives inside the `api` container's Python process, and the healing engine runs inside a *separate* `worker` container/process.** They don't share memory. The worker cannot just call `company_manager.update_agent_status(...)` directly — that object doesn't exist in the worker's process. Any wiring has to cross that process boundary, either over HTTP or through shared durable state (Postgres). This is the same class of problem projects/healing already had (in-memory state, not shared across containers) — solved the same way in §2/§4 (move it into Postgres), and the fix here should follow that precedent rather than invent a new pattern.

**Recommended path (uses the persistence work already done as precedent):**

1. **Migrate `company_manager`/`task_queue` off in-memory Pydantic singletons and onto Postgres**, the same way `projects_db`/`healing_history` were migrated in §2. Add SQLAlchemy models for `Department` and `CompanyAgent` (name it distinctly from any existing model — `agents/base.py`'s `Agent` Pydantic class is unrelated to the `Worker` SQLAlchemy model added in §4, don't conflate them) to `src/models/database.py`, and rewrite `src/api/company.py`'s handlers to use `AsyncSession` queries instead of the in-memory `company.departments` list — mechanically identical to what `src/api/projects.py` and `src/api/healing.py` already do post-fix.
2. **Add a nullable `handled_by_agent_id` FK column to `HealingRecord`** pointing at the new `CompanyAgent` table. This is the actual link between "a healing task happened" and "an agent's work history."
3. **Seed one designated agent** — e.g. `name="Ops Engine"`, `department=DepartmentType.OPERATIONS` — either at startup or lazily the first time a healing task needs one. This is the sprite that represents the self-healing engine in the Office view.
4. **Wire the worker side**: in `src/worker/worker.py`'s `_handle_heal_project` (and the plain `heal` path), immediately after dispatching to `self.healing_engine.heal(...)`, update that agent's row directly in Postgres — `status=WORKING, behavior=DEBUGGING` while a task is in flight, `behavior=SUCCESS`/`ERROR` and `tasks_completed`/`tasks_failed` incremented on terminal outcome, `last_active=now()`. Since both containers now read/write the same Postgres tables (once step 1 is done), this is a direct DB write from the worker process — no HTTP hop, no dependency on the `api` container being reachable, consistent with how `HealingRecord` updates already work (§4's `_update_healing_record`).
5. **Frontend — genuinely small.** `Office.tsx`'s existing `STATUS_COLORS` map and `getStatusRoom(behavior)` function already do exactly the "change color/room based on behavior string" job you're asking for — they're generic today, not company-sim-specific. The only real gaps: (a) `getStatusRoom` doesn't currently special-case `debugging`/`error`/`success` into a distinguishable room (they'd fall through to the generic `eng1` desk) — route them to the existing `server` room instead, which already exists as a room type and reads naturally as "this is infra work"; (b) an agent detail panel that, when the Ops agent is selected, fetches and lists `GET /api/heal/history` filtered to `handled_by_agent_id` — almost entirely reusing `SelfHealing.tsx`'s existing history rendering, just re-hosted in the agent detail view.

**What this gets you, concretely:** kill a monitored container → worker detects it, pushes a healing task → Ops agent's sprite in the Office view turns from idle-gray to working-blue, moves to the Server Room → if it resolves, flips to success-green with the fix logged; if it exhausts retries, flips to error-red and the Telegram alert fires (§4) at the same moment the sprite goes red. That's the "AI company that heals itself" narrative actually working end-to-end, not staged.

**What this does NOT require:** touching the other departments (Sales, Marketing, HR, Legal, etc.) — they can stay exactly as decorative/manually-operated as they are today without undermining the Ops-agent story, as long as they aren't marketed as automated (see §5.4).

### 5.3 Updated effort estimate (supersedes nothing in §3.5 — this is additive)

§3.5's 4–6 week estimate covers the self-healing engine itself and assumed it would ship standalone. The bundling decision adds the following on top, using the same sizing approach:

| Work item | Est. effort |
|---|---|
| Migrate `company_manager`/`task_queue` from in-memory Pydantic to Postgres-backed models (new `Department`/`CompanyAgent` tables, rewrite `src/api/company.py` handlers) | 3–4 days |
| Add `handled_by_agent_id` to `HealingRecord`, seed the designated Ops agent | 1 day |
| Wire worker-side status updates into the Ops agent's DB row on task start/terminal outcome | 2 days |
| `Office.tsx`: route healing-specific behaviors to a distinguishable room/visual state (color, pulse/halo on error), update the legend | 1–2 days |
| Agent detail panel: real healing history sourced from `/api/heal/history`, reusing `SelfHealing.tsx`'s existing rendering | 1 day |
| Fix (or formally drop) the hardcoded-`localhost` Redis calls in `company/manager.py`/`task_queue.py` — moot if step 1 lands, but must be explicitly decided either way, not left as-is | 0.5 day |
| Decide and act on `Budget.tsx`'s dead `/api/company/budgets` endpoint — see §5.4, not optional busywork once this is a customer-facing bundle | 0.5–2 days depending on real-vs-hide decision |
| End-to-end demo polish and testing (kill container → sprite reacts → history/alert consistent) | 1–2 days |

**Total additional: roughly 1.5–2 weeks (8–13 working days)** on top of §3.5's 4–6 weeks, assuming the same solo pace demonstrated in this session. **Revised total to a bundled, non-gimmick MVP: roughly 6–8 weeks.**

### 5.4 Updated MVP feature list for the bundled scenario (supersedes §3.4's scope split, not its must-have/nice-to-have framing)

§3.4 recommended cutting the company-sim layer entirely for v1. That's no longer the plan. Given the bundle, the bar changes to: **every company-sim element visible in v1 must either reflect real backend state, or be clearly non-functional decoration — nothing in between, because "AI company that heals itself" is the entire pitch, and a fake-looking Ops agent breaks it worse than not having an Office view at all.**

**Must-have for v1 (in addition to §3.4's original self-healing must-haves):**
- The Ops/Healing agent's status, position, and color in the Office view **must** be driven by real `HealingRecord`/worker state (§5.2) — this is not optional polish, it *is* the product's headline feature made visible.
- Company-sim state (departments, agents) **must** be Postgres-backed, not in-memory — an Ops agent whose identity and history vanish on every container restart directly contradicts the "durable self-healing state" work already done in §2, and would be an obvious tell in a demo or trial.
- The Ops agent's click-through history **must** show real healing records, not a separate/fake activity feed.
- `Budget.tsx` must be fixed one way or the other before shipping: either wire it to something real (e.g. sum `Execution.estimated_cost` / token usage already tracked in the `Execution` model from §1.5, which nothing currently populates either — that's its own gap) or remove the nav entry. Shipping a page that silently 404s on every load is a bad first impression in a paid product, worse than not having the feature.

**Can stay exactly as-is (decorative, not wired) for v1, as long as it's not oversold:**
- Every non-Ops department (Sales, Marketing, Finance, Product, Support, HR, Legal, Customer Service) — these can remain manually-operated simulation UI. Nothing about them needs to be "real" for the self-healing pitch to land, since the buyer (§3.1) isn't buying an AI sales team.
- The general-purpose `task_queue.py` company-task system (unrelated to healing tasks) — fine to leave in-memory or even unfinished for v1; it's not part of the demo path.
- Idle-state ambient behavior for non-Ops agents (walking between rooms, meetings, breaks) — purely cosmetic, no functional bar to clear.

**Explicitly defer to v1.1+:**
- Multiple simultaneous Ops sprites (one per concurrently-healing incident) if you're monitoring many workers at once — a single Ops agent representing "the healing engine" as one entity is enough to sell the story for v1.
- Automating any other department (e.g. an actual AI agent doing real marketing copy or real sales outreach) — a much larger scope than this analysis covers, and not needed for the bundled self-healing narrative to be true.
