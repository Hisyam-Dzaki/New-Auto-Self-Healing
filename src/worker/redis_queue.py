import redis
import json
import time
from typing import Dict, Any, Optional, List
from enum import Enum

class QueueType(str, Enum):
    INCOMING = "queue:incoming"
    PROCESSING = "queue:processing"
    RETRY = "queue:retry"
    DEADLETTER = "queue:deadletter"

class RedisQueue:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.client = redis.from_url(redis_url, decode_responses=True)
        self.max_retries = 3
    
    def push_task(self, task: Dict[str, Any], queue: QueueType = QueueType.INCOMING) -> str:
        task_id = task.get("id") or f"task_{int(time.time() * 1000)}"
        task["id"] = task_id
        task["created_at"] = time.time()
        task["retry_count"] = task.get("retry_count", 0)
        
        self.client.rpush(queue.value, json.dumps(task))
        return task_id
    
    def pop_task(self, queue: QueueType = QueueType.INCOMING, timeout: int = 5) -> Optional[Dict]:
        result = self.client.blpop(queue.value, timeout=timeout)
        if result:
            _, task_json = result
            return json.loads(task_json)
        return None
    
    def lock_task(self, task_id: str, ttl: int = 300) -> bool:
        lock_key = f"lock:task:{task_id}"
        return self.client.set(lock_key, "1", nx=True, ex=ttl)
    
    def unlock_task(self, task_id: str):
        lock_key = f"lock:task:{task_id}"
        self.client.delete(lock_key)
    
    def is_locked(self, task_id: str) -> bool:
        lock_key = f"lock:task:{task_id}"
        return self.client.exists(lock_key) > 0
    
    def cache_fix(self, signature: str, fix: Dict, ttl: int = 86400):
        cache_key = f"cache:fix:{signature}"
        self.client.setex(cache_key, ttl, json.dumps(fix))
    
    def get_cached_fix(self, signature: str) -> Optional[Dict]:
        cache_key = f"cache:fix:{signature}"
        cached = self.client.get(cache_key)
        if cached:
            return json.loads(cached)
        return None
    
    def set_state(self, key: str, value: Any, ttl: Optional[int] = None):
        state_key = f"state:{key}"
        if ttl:
            self.client.setex(state_key, ttl, json.dumps(value))
        else:
            self.client.set(state_key, json.dumps(value))
    
    def get_state(self, key: str) -> Optional[Any]:
        state_key = f"state:{key}"
        value = self.client.get(state_key)
        if value:
            return json.loads(value)
        return None
    
    def retry_task(self, task: Dict):
        task["retry_count"] = task.get("retry_count", 0) + 1
        task["last_retry"] = time.time()
        
        if task["retry_count"] >= self.max_retries:
            self.push_task(task, QueueType.DEADLETTER)
        else:
            self.push_task(task, QueueType.RETRY)
    
    def get_queue_size(self, queue: QueueType) -> int:
        return self.client.llen(queue.value)
    
    def get_all_queue_sizes(self) -> Dict[str, int]:
        return {
            "incoming": self.get_queue_size(QueueType.INCOMING),
            "processing": self.get_queue_size(QueueType.PROCESSING),
            "retry": self.get_queue_size(QueueType.RETRY),
            "deadletter": self.get_queue_size(QueueType.DEADLETTER)
        }
    
    def clear_queue(self, queue: QueueType):
        self.client.delete(queue.value)
    
    def peek_deadletter(self, limit: int = 10) -> List[Dict]:
        tasks = self.client.lrange(QueueType.DEADLETTER.value, 0, limit - 1)
        return [json.loads(t) for t in tasks]
    
    def health_check(self) -> Dict:
        try:
            self.client.ping()
            return {
                "status": "healthy",
                "queues": self.get_all_queue_sizes()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }