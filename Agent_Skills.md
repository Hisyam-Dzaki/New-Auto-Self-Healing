# Agent Skills Architecture — AgentForge

## 1. Overview

Dalam AgentForge, **Skills** adalah abstraction layer di atas tools dan workflows.

Skill merepresentasikan:

> “kemampuan tingkat tinggi yang dimiliki agent.”

Contoh:

* membuat backend
* debugging aplikasi
* membaca logs
* deploy project
* refactor code
* generate Docker setup

---

# 2. Why Skills Matter

Tanpa skill:

* agent hanya kumpulan tool calls acak
* reasoning sulit dikontrol
* workflow tidak reusable

Dengan skill:

* agent lebih modular
* mudah routing
* mudah evaluasi
* mudah fine-tuning behavior
* bisa dibuat marketplace/plugin system

---

# 3. Architecture Hierarchy

```text id="ef9m1h"
Agent
 ├── Skills
 │     ├── Workflows
 │     │     ├── Tasks
 │     │     │     ├── Tool Calls
 │     │     │     └── Validations
 │     │     └── Policies
 │     └── Memory
 │
 └── Models
```

---

# 4. Skill Definition

## Concept

Skill = reusable high-level capability.

---

## Example

### Skill

```text id="8q1yq7"
Fix Backend Error
```

### Internally

```text id="pj1r4v"
- analyze logs
- inspect source code
- identify root cause
- generate patch
- run tests
- restart service
```

---

# 5. Skill Categories

# 5.1 Development Skills

| Skill          | Purpose                |
| -------------- | ---------------------- |
| create_project | bootstrap app          |
| generate_api   | create API             |
| generate_ui    | frontend generation    |
| add_feature    | feature implementation |
| refactor_code  | improve code           |
| write_tests    | generate tests         |

---

# 5.2 Debugging Skills

| Skill                | Purpose               |
| -------------------- | --------------------- |
| analyze_logs         | inspect logs          |
| fix_runtime_error    | runtime fixes         |
| fix_build_error      | build fixes           |
| dependency_repair    | dependency resolution |
| optimize_performance | performance tuning    |

---

# 5.3 Infrastructure Skills

| Skill               | Purpose       |
| ------------------- | ------------- |
| create_docker_setup | Docker config |
| manage_container    | container ops |
| deploy_project      | deployment    |
| configure_nginx     | reverse proxy |
| setup_ssl           | TLS setup     |

---

# 5.4 AI Skills

| Skill             | Purpose           |
| ----------------- | ----------------- |
| summarize_context | compress memory   |
| route_model       | select model      |
| evaluate_output   | output validation |
| retry_reasoning   | recovery          |

---

# 5.5 Future Autonomous Skills

| Skill             | Purpose           |
| ----------------- | ----------------- |
| self_heal_project | autonomous repair |
| monitor_runtime   | runtime analysis  |
| auto_scale        | scaling decisions |
| auto_patch        | apply fixes       |

---

# 6. Skill Composition Architecture

# Philosophy

Skills dapat memanggil:

* workflows
* sub-skills
* tools

---

# Example

```text id="it48ux"
Skill:
Fix Build Failure

 ├── Analyze Logs
 ├── Inspect Dependencies
 ├── Generate Fix
 ├── Run Build
 └── Validate Output
```

---

# 7. Skill Lifecycle

```text id="u2zks9"
Request
  ↓
Skill Selection
  ↓
Planning
  ↓
Execution
  ↓
Validation
  ↓
Result
```

---

# 8. Skill Selection Engine

# Objective

Memilih skill paling relevan.

---

# Inputs

| Input         | Example            |
| ------------- | ------------------ |
| user prompt   | "fix docker issue" |
| project type  | FastAPI            |
| runtime state | container crashed  |
| logs          | npm build failed   |

---

# Outputs

```yaml id="j9h1be"
selected_skill:
  - analyze_logs
  - fix_build_error
```

---

# 9. Skill Metadata Schema

## Example

```yaml id="me6vdl"
id: fix_runtime_error

name: Fix Runtime Error

description: Analyze and repair application runtime failures

category: debugging

required_tools:
  - logs_tool
  - file_tool
  - shell_tool

supported_runtimes:
  - python
  - node
  - docker

risk_level: medium

requires_approval: false

max_execution_time: 10m
```

---

# 10. Skill Registry

# Purpose

Central registry semua skill.

---

# Architecture

```text id="1cbg81"
Agent
  ↓
Skill Registry
  ↓
Skill Loader
  ↓
Workflow Executor
```

---

# Suggested Structure

```text id="yng7gq"
/packages/skills
│
├── development
├── debugging
├── infrastructure
├── ai
├── security
└── autonomous
```

---

# 11. Skill Interface

## Python Interface

```python id="ij2oqt"
class BaseSkill:
    id: str
    name: str

    async def plan(self, context):
        pass

    async def execute(self, context):
        pass

    async def validate(self, result):
        pass
```

---

# 12. Skill Context Object

## Purpose

Shared execution state.

---

## Example

```python id="wkk4j4"
class SkillContext:
    user_prompt: str
    project_path: str
    runtime: str

    logs: list
    files: list

    provider: str
    model: str
```

---

# 13. Skill Execution Modes

# Mode A — Assisted

AI meminta approval user.

---

# Mode B — Semi-Autonomous

AI menjalankan workflow terbatas.

---

# Mode C — Autonomous

AI execute full loop.

---

# 14. Skill Risk Levels

| Level    | Description        |
| -------- | ------------------ |
| low      | read-only          |
| medium   | edit files         |
| high     | restart/deploy     |
| critical | delete/destructive |

---

# Approval Matrix

| Risk     | Approval |
| -------- | -------- |
| low      | no       |
| medium   | optional |
| high     | required |
| critical | always   |

---

# 15. Skill Memory Integration

# Purpose

Skills dapat:

* membaca previous fixes
* reuse patterns
* improve retries

---

# Example

```text id="ms2dtx"
Previous Error:
"FastAPI import failure"

Previous Fix:
"requirements.txt mismatch"
```

---

# 16. Skill + Model Routing

# Objective

Skill menentukan model terbaik.

---

# Example

| Skill                 | Recommended Model     |
| --------------------- | --------------------- |
| summarize_context     | cheap fast model      |
| refactor_code         | strong coding model   |
| analyze_logs          | long-context model    |
| architecture_planning | reasoning-heavy model |

---

# Example Routing

```yaml id="trh4v9"
skill_routes:
  analyze_logs:
    provider: gemini
    model: gemini-2.5-pro

  refactor_code:
    provider: anthropic
    model: claude-opus
```

---

# 17. Skill Guardrails

# Restrictions

Skills harus:

* obey filesystem limits
* obey command whitelist
* obey timeout policy

---

# Example

```yaml id="fryrbo"
guardrails:
  max_commands: 20
  max_runtime: 15m
  require_approval:
    - deploy
    - delete
```

---

# 18. Skill Evaluation System

# Metrics

| Metric       | Purpose       |
| ------------ | ------------- |
| success_rate | effectiveness |
| retry_rate   | reliability   |
| avg_duration | efficiency    |
| token_cost   | economics     |

---

# Example

```json id="vbvngh"
{
  "skill": "fix_runtime_error",
  "success_rate": 0.81,
  "avg_duration_sec": 92
}
```

---

# 19. Future: Skill Marketplace

# Vision

External developers dapat publish:

* workflows
* skills
* tool packs

---

# Example

```text id="cr4obv"
Marketplace
 ├── Laravel Skills
 ├── Kubernetes Skills
 ├── Flutter Skills
 └── DevOps Skills
```

---

# 20. Future: Self-Learning Skills

# Goal

Agent improve over time.

---

# Flow

```text id="sld7rq"
Execution
  ↓
Result Analysis
  ↓
Pattern Extraction
  ↓
Memory Update
  ↓
Better Future Execution
```

---

# 21. Recommended MVP Skills

## Include First

### Development

✅ create_project
✅ generate_api
✅ create_docker_setup

### Debugging

✅ analyze_logs
✅ fix_build_error
✅ fix_runtime_error

### Infrastructure

✅ manage_container
✅ restart_service

### AI

✅ summarize_context
✅ route_model

---

# 22. Avoid Early Complexity

## Avoid Initially

❌ autonomous deployment
❌ self-learning mutations
❌ recursive agents
❌ agent spawning
❌ internet-wide automation

---

# 23. Long-Term Vision

Skills menjadi:

> “modular intelligence units”

yang memungkinkan AgentForge berkembang dari:

* AI coding assistant

menjadi:

* autonomous software operator
* infrastructure engineer
* self-healing runtime system
* AI-native execution platform.
