import asyncio
import time
import signal
import sys
from enum import Enum
from typing import Optional, Dict, Any
from .redis_queue import RedisQueue, QueueType
from .log_analyzer import LogAnalyzer
from .resource_monitor import ResourceMonitor
from .self_healing_engine import SelfHealingEngine
from .notifier import Notifier

class WorkerMode(str, Enum):
    MONITOR = "monitor"
    ANALYZE = "analyze"
    REPAIR = "repair"
    RETRY = "retry"
    CLEANUP = "cleanup"
    DEPLOY = "deploy"

class Worker:
    def __init__(self):
        self.redis_queue = RedisQueue()
        self.log_analyzer = LogAnalyzer()
        self.resource_monitor = ResourceMonitor()
        
        from ..providers.llm_router import LLMRouter
        self.llm_router = LLMRouter()
        
        self.healing_engine = SelfHealingEngine(self.redis_queue, self.llm_router)
        self.notifier = Notifier()

        # per-container thresholds for the cross-container watch (separate from the
        # host-level thresholds in ResourceMonitor, which only look at this host itself)
        self.container_cpu_threshold = 90.0
        self.container_memory_threshold = 90.0

        self.running = False
        self.current_mode = WorkerMode.MONITOR
        self.worker_id = f"worker_{int(time.time())}"
        
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        print(f"\nReceived signal {signum}, shutting down gracefully...")
        self.running = False
    
    async def start(self):
        self.running = True
        
        self.redis_queue.set_state("worker", {
            "id": self.worker_id,
            "status": "running",
            "started_at": time.time()
        })
        
        print(f"Worker {self.worker_id} started")
        
        tasks = [
            self._monitor_loop(),
            self._process_queue_loop(),
            self._retry_loop(),
            self._cleanup_loop(),
            self._worker_heartbeat_loop()
        ]
        
        await asyncio.gather(*tasks)
    
    async def _monitor_loop(self):
        """Monitor system resources and detect issues"""
        while self.running:
            try:
                health = self.resource_monitor.check_health()
                
                if not health["healthy"]:
                    for issue in health["issues"]:
                        task = {
                            "type": "resource_issue",
                            "issue": issue,
                            "detected_at": time.time()
                        }
                        self.redis_queue.push_task(task)

                        if issue.get("severity") == "critical":
                            await self.notifier.alert_critical_issue(
                                issue_type=issue.get("type", "unknown"),
                                target="host",
                                details=f"value={issue.get('value')} threshold={issue.get('threshold')}"
                            )

                anomaly = self.resource_monitor.detect_anomaly()
                if anomaly:
                    task = {
                        "type": "anomaly",
                        "anomaly": anomaly,
                        "detected_at": time.time()
                    }
                    self.redis_queue.push_task(task)

                await self._check_all_containers()

                self.redis_queue.set_state("worker", {
                    "id": self.worker_id,
                    "status": "running",
                    "mode": "monitor",
                    "metrics": health["metrics"],
                    "last_check": time.time()
                })
                
                await asyncio.sleep(30)
                
            except Exception as e:
                print(f"Monitor loop error: {e}")
                await asyncio.sleep(10)
    
    async def _check_all_containers(self):
        """Sweep every Docker container on the host (not just this system's own),
        raising resource_issue tasks for any container over threshold. Uses the same
        docker.from_env() primitive already exposed via GET /api/monitor/docker —
        this just calls it automatically instead of only on-demand."""
        stats = self.resource_monitor.get_docker_stats()

        if "error" in stats:
            return

        for container in stats.get("containers", []):
            name = container.get("name", "unknown")
            cpu = container.get("cpu_percent", 0)
            memory = container.get("memory_percent", 0)

            if cpu > self.container_cpu_threshold:
                task = {
                    "type": "resource_issue",
                    "issue": {
                        "type": "container_cpu_spike",
                        "severity": "high",
                        "value": cpu,
                        "threshold": self.container_cpu_threshold,
                        "container": name
                    },
                    "detected_at": time.time()
                }
                self.redis_queue.push_task(task)

            if memory > self.container_memory_threshold:
                task = {
                    "type": "resource_issue",
                    "issue": {
                        "type": "container_memory_high",
                        "severity": "critical",
                        "value": memory,
                        "threshold": self.container_memory_threshold,
                        "container": name
                    },
                    "detected_at": time.time()
                }
                self.redis_queue.push_task(task)
                await self.notifier.alert_critical_issue(
                    issue_type="container_memory_high",
                    target=name,
                    details=f"memory={memory:.1f}% threshold={self.container_memory_threshold}%"
                )

            if container.get("status") not in ("running", None):
                await self.notifier.alert_critical_issue(
                    issue_type="container_not_running",
                    target=name,
                    details=f"status={container.get('status')}"
                )

    async def _worker_heartbeat_loop(self):
        """Check registered external workers (content engine, trading bot, market
        scanner, etc.) for missed heartbeats and alert when one goes quiet."""
        while self.running:
            try:
                from sqlalchemy import select
                from ..models.database import AsyncSessionLocal, Worker
                from ..api.workers import _health_from_heartbeat
                from datetime import datetime, timezone

                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(Worker))
                    registered_workers = result.scalars().all()

                    for w in registered_workers:
                        health = _health_from_heartbeat(w)

                        if health in ("late", "dead"):
                            elapsed = 0.0
                            if w.last_heartbeat_at:
                                last = w.last_heartbeat_at
                                if last.tzinfo is None:
                                    last = last.replace(tzinfo=timezone.utc)
                                elapsed = (datetime.now(timezone.utc) - last).total_seconds()

                            await self.notifier.alert_worker_missed_heartbeat(
                                worker_name=w.name,
                                elapsed_seconds=elapsed,
                                health=health
                            )

                await asyncio.sleep(60)

            except Exception as e:
                print(f"Worker heartbeat loop error: {e}")
                await asyncio.sleep(30)

    async def _process_queue_loop(self):
        """Process incoming tasks from queue"""
        while self.running:
            try:
                task = self.redis_queue.pop_task(QueueType.INCOMING, timeout=5)
                
                if not task:
                    await asyncio.sleep(1)
                    continue
                
                task_id = task.get("id")
                
                if self.redis_queue.is_locked(task_id):
                    self.redis_queue.push_task(task, QueueType.INCOMING)
                    continue
                
                if not self.redis_queue.lock_task(task_id, ttl=300):
                    continue
                
                try:
                    result = await self._process_task(task)
                    
                    if result.get("status") == "retry":
                        self.redis_queue.retry_task(task)
                    elif result.get("status") == "failed":
                        self.redis_queue.push_task(task, QueueType.DEADLETTER)
                        await self.notifier.alert_deadletter({**task, "reason": result.get("reason")})
                    
                finally:
                    self.redis_queue.unlock_task(task_id)
                
            except Exception as e:
                print(f"Queue processing error: {e}")
                await asyncio.sleep(5)
    
    async def _process_task(self, task: Dict) -> Dict:
        task_type = task.get("type")
        
        if task_type == "heal":
            return await self.healing_engine.heal(task)

        elif task_type == "heal_project":
            return await self._handle_heal_project(task)

        elif task_type == "resource_issue":
            return await self._handle_resource_issue(task)

        elif task_type == "anomaly":
            return await self._handle_anomaly(task)

        elif task_type == "container_crash":
            return await self._handle_container_crash(task)

        else:
            return {"status": "failed", "reason": "unknown_task_type"}

    async def _handle_heal_project(self, task: Dict) -> Dict:
        """Handle logs pushed by an external worker via POST /api/heal/receive.
        Routes through the same escalation ladder as internal 'heal' tasks, using the
        project id/name as the 'service' identifier, then persists the outcome to
        HealingRecord and reflects it on the 'Ops Engine' company-sim agent so the
        Office view shows real healing activity, not a manually-toggled status."""
        await self._set_ops_agent_working()

        heal_task = {
            **task,
            "service": task.get("project_name") or task.get("project_id", "unknown"),
        }
        result = await self.healing_engine.heal(heal_task)
        await self._update_healing_record(task.get("task_id"), result)

        if result.get("status") in ("fixed", "analysis_complete"):
            await self._set_ops_agent_outcome(success=True)
        elif result.get("status") == "failed":
            await self._set_ops_agent_outcome(success=False)
        # "retry" is a mid-ladder state — leave the agent as "working" until it resolves

        return result

    async def _update_healing_record(self, task_id: Optional[str], result: Dict):
        if not task_id:
            return
        try:
            from sqlalchemy import select
            from ..models.database import AsyncSessionLocal, HealingRecord, get_ops_engine_agent_id
            import uuid as _uuid

            async with AsyncSessionLocal() as session:
                res = await session.execute(select(HealingRecord).where(HealingRecord.task_id == task_id))
                record = res.scalar_one_or_none()
                if record:
                    record.status = result.get("status", record.status)
                    record.result = result
                    if not record.handled_by_agent_id:
                        ops_agent_id = await get_ops_engine_agent_id()
                        if ops_agent_id:
                            record.handled_by_agent_id = _uuid.UUID(ops_agent_id)
                    await session.commit()
        except Exception as e:
            print(f"Failed to update healing record {task_id}: {e}")

    async def _set_ops_agent_working(self):
        await self._update_ops_agent(status="working", behavior="debugging")

    async def _set_ops_agent_outcome(self, success: bool):
        if success:
            await self._update_ops_agent(status="success", behavior="success", increment="tasks_completed")
        else:
            await self._update_ops_agent(status="error", behavior="error", increment="tasks_failed")

    async def _update_ops_agent(self, status: str, behavior: str, increment: Optional[str] = None):
        try:
            from sqlalchemy import select
            from ..models.database import AsyncSessionLocal, CompanyAgent
            from datetime import datetime, timezone

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(CompanyAgent).where(CompanyAgent.is_system_agent == True)  # noqa: E712
                )
                agent = result.scalar_one_or_none()
                if not agent:
                    return

                agent.status = status
                agent.behavior = behavior
                agent.last_active = datetime.now(timezone.utc)
                if increment:
                    setattr(agent, increment, (getattr(agent, increment) or 0) + 1)

                await session.commit()
        except Exception as e:
            print(f"Failed to update Ops Engine agent: {e}")
    
    async def _handle_resource_issue(self, task: Dict) -> Dict:
        issue = task.get("issue", {})
        issue_type = issue.get("type")
        
        if issue_type == "disk_full":
            from .self_healing_engine import DeterministicFixes
            result = DeterministicFixes.cleanup_disk()
            
            if result.get("status") == "success":
                return {"status": "fixed", "action": "cleanup_disk"}
        
        elif issue_type == "memory_high":
            import docker
            client = docker.from_env()
            containers = client.containers.list()
            
            for container in containers:
                stats = container.stats(stream=False)
                memory_usage = stats['memory_stats'].get('usage', 0)
                memory_limit = stats['memory_stats'].get('limit', 1)
                memory_percent = (memory_usage / memory_limit) * 100.0
                
                if memory_percent > 90:
                    container.restart()
                    return {"status": "fixed", "action": "restart_high_memory_container"}
        
        return {"status": "retry", "reason": "no_fix_applied"}
    
    async def _handle_anomaly(self, task: Dict) -> Dict:
        anomaly = task.get("anomaly", {})
        
        if anomaly.get("cpu_spike"):
            return {"status": "monitoring", "action": "cpu_spike_detected"}
        
        if anomaly.get("memory_spike"):
            return {"status": "monitoring", "action": "memory_spike_detected"}
        
        return {"status": "acknowledged"}
    
    async def _handle_container_crash(self, task: Dict) -> Dict:
        container_name = task.get("container_name")
        
        from .self_healing_engine import DeterministicFixes
        result = DeterministicFixes.restart_service(container_name)
        
        if result.get("status") == "success":
            return {"status": "fixed", "action": "restart"}
        
        return {"status": "retry", "reason": "restart_failed"}
    
    async def _retry_loop(self):
        """Process retry queue"""
        while self.running:
            try:
                task = self.redis_queue.pop_task(QueueType.RETRY, timeout=5)
                
                if task:
                    await asyncio.sleep(5)
                    self.redis_queue.push_task(task, QueueType.INCOMING)
                
                await asyncio.sleep(10)
                
            except Exception as e:
                print(f"Retry loop error: {e}")
                await asyncio.sleep(10)
    
    async def _cleanup_loop(self):
        """Periodic cleanup tasks"""
        while self.running:
            try:
                await asyncio.sleep(3600)
                
                from .self_healing_engine import DeterministicFixes
                DeterministicFixes.cleanup_disk()
                
            except Exception as e:
                print(f"Cleanup loop error: {e}")
    
    def get_status(self) -> Dict:
        return {
            "worker_id": self.worker_id,
            "running": self.running,
            "mode": self.current_mode.value,
            "queues": self.redis_queue.get_all_queue_sizes(),
            "metrics": self.resource_monitor.get_metrics().__dict__
        }

async def main():
    worker = Worker()
    await worker.start()

if __name__ == "__main__":
    asyncio.run(main())