import psutil
import time
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class ResourceMetrics:
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_free_gb: float
    timestamp: float

class ResourceMonitor:
    def __init__(self):
        self.cpu_threshold = 90.0
        self.memory_threshold = 85.0
        self.disk_threshold = 90.0
        self.history = []
        self.max_history = 100
    
    def get_metrics(self) -> ResourceMetrics:
        cpu = psutil.cpu_percent(interval=1)
        
        memory = psutil.virtual_memory()
        memory_used_mb = memory.used / (1024 * 1024)
        memory_available_mb = memory.available / (1024 * 1024)
        
        disk = psutil.disk_usage('/')
        disk_used_gb = disk.used / (1024 * 1024 * 1024)
        disk_free_gb = disk.free / (1024 * 1024 * 1024)
        
        metrics = ResourceMetrics(
            cpu_percent=cpu,
            memory_percent=memory.percent,
            memory_used_mb=memory_used_mb,
            memory_available_mb=memory_available_mb,
            disk_percent=disk.percent,
            disk_used_gb=disk_used_gb,
            disk_free_gb=disk_free_gb,
            timestamp=time.time()
        )
        
        self._add_to_history(metrics)
        
        return metrics
    
    def _add_to_history(self, metrics: ResourceMetrics):
        self.history.append(metrics)
        if len(self.history) > self.max_history:
            self.history.pop(0)
    
    def check_health(self) -> Dict:
        metrics = self.get_metrics()
        
        issues = []
        
        if metrics.cpu_percent > self.cpu_threshold:
            issues.append({
                "type": "cpu_spike",
                "severity": "high",
                "value": metrics.cpu_percent,
                "threshold": self.cpu_threshold
            })
        
        if metrics.memory_percent > self.memory_threshold:
            issues.append({
                "type": "memory_high",
                "severity": "high",
                "value": metrics.memory_percent,
                "threshold": self.memory_threshold
            })
        
        if metrics.disk_percent > self.disk_threshold:
            issues.append({
                "type": "disk_full",
                "severity": "critical",
                "value": metrics.disk_percent,
                "threshold": self.disk_threshold
            })
        
        return {
            "healthy": len(issues) == 0,
            "metrics": {
                "cpu": metrics.cpu_percent,
                "memory": metrics.memory_percent,
                "disk": metrics.disk_percent
            },
            "issues": issues
        }
    
    def get_process_info(self, pid: Optional[int] = None) -> Dict:
        try:
            if pid:
                process = psutil.Process(pid)
            else:
                process = psutil.Process()
            
            return {
                "pid": process.pid,
                "name": process.name(),
                "status": process.status(),
                "cpu_percent": process.cpu_percent(interval=0.1),
                "memory_percent": process.memory_percent(),
                "memory_mb": process.memory_info().rss / (1024 * 1024),
                "num_threads": process.num_threads(),
                "create_time": process.create_time()
            }
        except psutil.NoSuchProcess:
            return {"error": "Process not found"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_docker_stats(self) -> Dict:
        try:
            import docker
            client = docker.from_env()
            
            containers = client.containers.list()
            stats = []
            
            for container in containers:
                container_stats = container.stats(stream=False)
                
                cpu_delta = container_stats['cpu_stats']['cpu_usage']['total_usage'] - \
                           container_stats['precpu_stats']['cpu_usage']['total_usage']
                system_delta = container_stats['cpu_stats']['system_cpu_usage'] - \
                              container_stats['precpu_stats']['system_cpu_usage']
                cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0.0
                
                memory_usage = container_stats['memory_stats'].get('usage', 0)
                memory_limit = container_stats['memory_stats'].get('limit', 1)
                memory_percent = (memory_usage / memory_limit) * 100.0 if memory_limit > 0 else 0.0
                
                stats.append({
                    "name": container.name,
                    "id": container.id[:12],
                    "status": container.status,
                    "cpu_percent": round(cpu_percent, 2),
                    "memory_percent": round(memory_percent, 2),
                    "memory_mb": round(memory_usage / (1024 * 1024), 2)
                })
            
            return {
                "containers": stats,
                "count": len(stats)
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_average_metrics(self, window: int = 10) -> Dict:
        if not self.history:
            return {}
        
        recent = self.history[-window:]
        
        avg_cpu = sum(m.cpu_percent for m in recent) / len(recent)
        avg_memory = sum(m.memory_percent for m in recent) / len(recent)
        avg_disk = sum(m.disk_percent for m in recent) / len(recent)
        
        return {
            "cpu_avg": round(avg_cpu, 2),
            "memory_avg": round(avg_memory, 2),
            "disk_avg": round(avg_disk, 2),
            "window_size": len(recent)
        }
    
    def detect_anomaly(self) -> Optional[Dict]:
        if len(self.history) < 10:
            return None
        
        recent = self.history[-10:]
        current = recent[-1]
        
        avg_cpu = sum(m.cpu_percent for m in recent[:-1]) / len(recent[:-1])
        avg_memory = sum(m.memory_percent for m in recent[:-1]) / len(recent[:-1])
        
        cpu_spike = current.cpu_percent > avg_cpu * 1.5
        memory_spike = current.memory_percent > avg_memory * 1.3
        
        if cpu_spike or memory_spike:
            return {
                "type": "resource_spike",
                "cpu_spike": cpu_spike,
                "memory_spike": memory_spike,
                "current_cpu": current.cpu_percent,
                "avg_cpu": avg_cpu,
                "current_memory": current.memory_percent,
                "avg_memory": avg_memory
            }
        
        return None