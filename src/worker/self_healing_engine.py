import hashlib
import time
from typing import Dict, Optional, List
from .log_analyzer import LogAnalyzer, IssueType

class DeterministicFixes:
    """Lightweight fixes that don't require AI"""
    
    @staticmethod
    def restart_service(service_name: str) -> Dict:
        import docker
        try:
            client = docker.from_env()
            container = client.containers.get(service_name)
            container.restart(timeout=30)
            return {
                "status": "success",
                "action": "restart",
                "service": service_name
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    @staticmethod
    def clear_cache() -> Dict:
        import redis
        try:
            r = redis.from_url("redis://localhost:6379")
            r.flushdb()
            return {
                "status": "success",
                "action": "clear_cache"
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    @staticmethod
    def cleanup_disk() -> Dict:
        import os
        import shutil
        
        cleaned = []
        
        temp_dirs = ["/tmp", "/var/tmp"]
        for temp_dir in temp_dirs:
            if os.path.exists(temp_dir):
                for item in os.listdir(temp_dir):
                    item_path = os.path.join(temp_dir, item)
                    try:
                        if os.path.isfile(item_path):
                            os.unlink(item_path)
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                        cleaned.append(item_path)
                    except:
                        pass
        
        return {
            "status": "success",
            "action": "cleanup_disk",
            "cleaned_items": len(cleaned)
        }
    
    @staticmethod
    def kill_zombie_processes() -> Dict:
        import psutil
        
        killed = []
        for proc in psutil.process_iter(['pid', 'name', 'status']):
            try:
                if proc.info['status'] == psutil.STATUS_ZOMBIE:
                    proc.kill()
                    killed.append(proc.info['pid'])
            except:
                pass
        
        return {
            "status": "success",
            "action": "kill_zombies",
            "killed_count": len(killed)
        }

class SelfHealingEngine:
    def __init__(self, redis_queue, llm_router):
        self.redis_queue = redis_queue
        self.llm_router = llm_router
        self.log_analyzer = LogAnalyzer()
        self.deterministic = DeterministicFixes()
    
    def generate_signature(self, issue_type: str, context: str) -> str:
        content = f"{issue_type}:{context[:500]}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def heal(self, task: Dict) -> Dict:
        task_id = task.get("id")
        logs = task.get("logs", "")
        service = task.get("service", "unknown")
        retry_count = task.get("retry_count", 0)
        
        classification = self.log_analyzer.classify(logs)
        issue_type = classification["primary_issue"]
        severity = classification["severity"]
        
        signature = self.generate_signature(issue_type, logs)
        
        cached_fix = self.redis_queue.get_cached_fix(signature)
        if cached_fix:
            return await self._apply_cached_fix(cached_fix, task)
        
        if retry_count == 0:
            return await self._attempt_deterministic_fix(issue_type, service, task)
        
        elif retry_count == 1:
            return await self._attempt_local_ai_fix(issue_type, logs, service, task)
        
        elif retry_count == 2:
            return await self._attempt_cloud_ai_fix(issue_type, logs, service, task)
        
        else:
            return {
                "status": "failed",
                "reason": "max_retries_exceeded",
                "task_id": task_id
            }
    
    async def _attempt_deterministic_fix(self, issue_type: str, service: str, task: Dict) -> Dict:
        fix_map = {
            IssueType.CONTAINER_CRASH.value: lambda: self.deterministic.restart_service(service),
            IssueType.REDIS_UNAVAILABLE.value: lambda: self.deterministic.restart_service("redis"),
            IssueType.DISK_FULL.value: lambda: self.deterministic.cleanup_disk(),
            IssueType.QUEUE_STUCK.value: lambda: self.deterministic.clear_cache(),
            IssueType.PROCESS_DEADLOCK.value: lambda: self.deterministic.kill_zombie_processes()
        }
        
        fix_func = fix_map.get(issue_type)
        
        if fix_func:
            result = fix_func()
            
            if result.get("status") == "success":
                signature = self.generate_signature(issue_type, task.get("logs", ""))
                self.redis_queue.cache_fix(signature, {
                    "type": "deterministic",
                    "action": result.get("action"),
                    "issue_type": issue_type
                })
                
                return {
                    "status": "fixed",
                    "method": "deterministic",
                    "action": result.get("action"),
                    "task_id": task.get("id")
                }
            else:
                return {
                    "status": "retry",
                    "reason": "deterministic_fix_failed",
                    "error": result.get("error")
                }
        
        return {
            "status": "retry",
            "reason": "no_deterministic_fix_available"
        }
    
    async def _attempt_local_ai_fix(self, issue_type: str, logs: str, service: str, task: Dict) -> Dict:
        filtered_logs = self.log_analyzer.filter_logs(logs, max_lines=50)
        error_context = self.log_analyzer.extract_error_context(filtered_logs)
        
        provider = self.llm_router.get_provider("ollama/codellama")
        
        if not provider:
            return {
                "status": "retry",
                "reason": "local_ai_unavailable"
            }
        
        prompt = f"""Analyze this error and provide a minimal fix.

Issue Type: {issue_type}
Service: {service}

Recent Errors:
{chr(10).join(error_context.get('errors', [])[:5])}

Provide:
1. Root cause (1 sentence)
2. Fix command or action (1 line)
3. Risk level (low/medium/high)

Be concise."""
        
        try:
            response = await provider.completion(
                messages=[{"role": "user", "content": prompt}],
                model="codellama:7b"
            )
            
            return {
                "status": "analysis_complete",
                "method": "local_ai",
                "analysis": response,
                "task_id": task.get("id")
            }
        except Exception as e:
            return {
                "status": "retry",
                "reason": "local_ai_failed",
                "error": str(e)
            }
    
    async def _attempt_cloud_ai_fix(self, issue_type: str, logs: str, service: str, task: Dict) -> Dict:
        filtered_logs = self.log_analyzer.filter_logs(logs, max_lines=100)
        error_context = self.log_analyzer.extract_error_context(filtered_logs)
        
        provider = self.llm_router.get_provider("anthropic/claude-3.5-sonnet")
        
        if not provider:
            provider = self.llm_router.get_provider("gpt-4")
        
        if not provider:
            return {
                "status": "failed",
                "reason": "no_cloud_ai_available"
            }
        
        prompt = f"""You are a DevOps engineer debugging a production issue.

Issue Type: {issue_type}
Service: {service}
Severity: HIGH

Error Context:
{chr(10).join(error_context.get('errors', [])[:10])}

Tracebacks:
{chr(10).join(error_context.get('tracebacks', [])[:2])}

Provide:
1. Root cause analysis
2. Step-by-step fix
3. Validation method
4. Rollback plan
5. Risk assessment

Be precise and actionable."""
        
        try:
            response = await provider.completion(
                messages=[{"role": "user", "content": prompt}],
                model="claude-3.5-sonnet"
            )
            
            signature = self.generate_signature(issue_type, logs)
            self.redis_queue.cache_fix(signature, {
                "type": "cloud_ai",
                "analysis": response,
                "issue_type": issue_type,
                "timestamp": time.time()
            })
            
            return {
                "status": "analysis_complete",
                "method": "cloud_ai",
                "analysis": response,
                "task_id": task.get("id")
            }
        except Exception as e:
            return {
                "status": "failed",
                "reason": "cloud_ai_failed",
                "error": str(e)
            }
    
    async def _apply_cached_fix(self, cached_fix: Dict, task: Dict) -> Dict:
        fix_type = cached_fix.get("type")
        
        if fix_type == "deterministic":
            action = cached_fix.get("action")
            service = task.get("service", "unknown")
            
            if action == "restart":
                result = self.deterministic.restart_service(service)
            elif action == "clear_cache":
                result = self.deterministic.clear_cache()
            elif action == "cleanup_disk":
                result = self.deterministic.cleanup_disk()
            else:
                result = {"status": "failed", "error": "unknown_action"}
            
            if result.get("status") == "success":
                return {
                    "status": "fixed",
                    "method": "cached_deterministic",
                    "action": action
                }
        
        return {
            "status": "retry",
            "reason": "cached_fix_failed"
        }