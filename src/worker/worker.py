import asyncio
import time
import signal
import sys
from enum import Enum
from typing import Optional
from .redis_queue import RedisQueue, QueueType
from .log_analyzer import LogAnalyzer
from .resource_monitor import ResourceMonitor
from .self_healing_engine import SelfHealingEngine

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
            self._cleanup_loop()
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
                
                anomaly = self.resource_monitor.detect_anomaly()
                if anomaly:
                    task = {
                        "type": "anomaly",
                        "anomaly": anomaly,
                        "detected_at": time.time()
                    }
                    self.redis_queue.push_task(task)
                
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
                    
                finally:
                    self.redis_queue.unlock_task(task_id)
                
            except Exception as e:
                print(f"Queue processing error: {e}")
                await asyncio.sleep(5)
    
    async def _process_task(self, task: Dict) -> Dict:
        task_type = task.get("type")
        
        if task_type == "heal":
            return await self.healing_engine.heal(task)
        
        elif task_type == "resource_issue":
            return await self._handle_resource_issue(task)
        
        elif task_type == "anomaly":
            return await self._handle_anomaly(task)
        
        elif task_type == "container_crash":
            return await self._handle_container_crash(task)
        
        else:
            return {"status": "failed", "reason": "unknown_task_type"}
    
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