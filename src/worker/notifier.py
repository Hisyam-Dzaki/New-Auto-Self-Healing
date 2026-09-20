import os
import time
import httpx

TELEGRAM_API_BASE = "https://api.telegram.org"


class Notifier:
    """Outbound alerting. Telegram is the only channel today (simplest to stand up);
    the generic webhook path is a straightforward follow-on using the same send() shape.

    No-ops quietly when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID aren't set, so this is
    safe to call unconditionally from the worker loop without extra guard clauses.
    """

    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        # avoid re-alerting on the same condition every monitor tick (30s)
        self._last_sent: dict = {}
        self._min_repeat_seconds = int(os.getenv("ALERT_MIN_REPEAT_SECONDS", "900"))

    @property
    def enabled(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    def _should_send(self, dedupe_key: str) -> bool:
        now = time.time()
        last = self._last_sent.get(dedupe_key)
        if last and (now - last) < self._min_repeat_seconds:
            return False
        self._last_sent[dedupe_key] = now
        return True

    async def send(self, message: str, dedupe_key: str = None) -> bool:
        if not self.enabled:
            return False

        if dedupe_key and not self._should_send(dedupe_key):
            return False

        url = f"{TELEGRAM_API_BASE}/bot{self.bot_token}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json={
                    "chat_id": self.chat_id,
                    "text": message,
                    "parse_mode": "Markdown",
                })
                return resp.status_code == 200
        except Exception as e:
            print(f"Notifier error: {e}")
            return False

    async def alert_deadletter(self, task: dict):
        service = task.get("service") or task.get("project_name") or "unknown"
        reason = task.get("reason", "max_retries_exceeded")
        await self.send(
            f"🔴 *Healing failed*\nService: `{service}`\nReason: `{reason}`\n"
            f"Task went to deadletter — manual review needed.",
            dedupe_key=f"deadletter:{service}:{reason}",
        )

    async def alert_worker_missed_heartbeat(self, worker_name: str, elapsed_seconds: float, health: str):
        emoji = "🟠" if health == "late" else "🔴"
        await self.send(
            f"{emoji} *Worker heartbeat {health}*\nWorker: `{worker_name}`\n"
            f"Last seen {int(elapsed_seconds)}s ago.",
            dedupe_key=f"heartbeat:{worker_name}:{health}",
        )

    async def alert_critical_issue(self, issue_type: str, target: str, details: str = ""):
        await self.send(
            f"🔴 *Critical issue detected*\nTarget: `{target}`\nType: `{issue_type}`\n{details}",
            dedupe_key=f"critical:{target}:{issue_type}",
        )
