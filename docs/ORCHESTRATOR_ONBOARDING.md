# Connecting an external worker (content engine / trading bot / market scanner / etc.)

This is the entire onboarding flow for pointing another container at this orchestrator.
No SDK needed — three HTTP calls, all documented below with `curl`.

Base URL in this doc assumes `docker-compose up` defaults: `http://localhost:8888`.

## 1. Create a project (once, per worker or per group of workers)

```bash
curl -X POST http://localhost:8888/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "trading-bot",
    "description": "Live trading bot on VPS #2",
    "source_type": "local",
    "auto_healing_enabled": true
  }'
```

Response includes `"id"` — save it, you'll use it as `project_id` below.

## 2. Register the worker

```bash
curl -X POST http://localhost:8888/api/workers/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "trading-bot-vps2",
    "worker_type": "trading-bot",
    "project_id": "<project_id from step 1>",
    "heartbeat_interval_seconds": 60
  }'
```

Response includes `"id"` — save it as `worker_id`. This is what the orchestrator uses to
detect the worker going silent (see §3).

## 3. Send a heartbeat on a timer

From inside the worker container (cron, a background thread, whatever fits), call this at
least as often as `heartbeat_interval_seconds` from step 2:

```bash
curl -X POST http://localhost:8888/api/workers/<worker_id>/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"status": "healthy"}'
```

If this stops arriving, the orchestrator's `_worker_heartbeat_loop` (checked every 60s,
`src/worker/worker.py`) marks the worker `late` after 2x the interval and `dead` after 5x,
and sends a Telegram alert (see §5).

## 4. Push a failure signal when something actually breaks

This does NOT need to be tied to the heartbeat — call it any time the worker hits an error
it can't self-recover from (crash, unhandled exception, API timeout, etc.):

```bash
curl -X POST http://localhost:8888/api/heal/receive \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<project_id from step 1>",
    "logs": "Traceback (most recent call last):\n  ...\nConnectionRefusedError: [Errno 111]",
    "source": "trading-bot-vps2",
    "metadata": {"exit_code": 1}
  }'
```

This gets classified (`src/worker/log_analyzer.py`), queued, and run through the
escalation ladder: deterministic fix → local AI → Claude — same pipeline this system uses
on itself. Check progress with:

```bash
curl http://localhost:8888/api/heal/history
curl http://localhost:8888/api/heal/history/<task_id>
```

## 5. Telegram alerts (optional but recommended)

1. Message **@BotFather** on Telegram, run `/newbot`, get a bot token.
2. Message your new bot once (anything), then hit
   `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your `chat.id`.
3. Set in `.env`:
   ```
   TELEGRAM_BOT_TOKEN=<token>
   TELEGRAM_CHAT_ID=<chat id>
   ```
4. Restart the `worker` container: `docker-compose restart worker`.

You'll get alerted on: a task hitting deadletter, a container over CPU/memory threshold,
a registered worker's heartbeat going `late` or `dead`. Repeat alerts for the same
condition are suppressed for `ALERT_MIN_REPEAT_SECONDS` (default 900s) to avoid spam.

## Checking what's currently monitored

```bash
curl http://localhost:8888/api/workers          # all registered workers + live health
curl http://localhost:8888/api/monitor/docker    # every container on the host, live stats
curl http://localhost:8888/api/queue/status      # queue depths
```
