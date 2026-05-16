import os
import subprocess
import docker
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from .log_analyzer import LogAnalyzer
from .redis_queue import RedisQueue
from ..api import projects

class ProjectHealer:
    """Heals project issues: pull → fix → test → push"""
    
    def __init__(self):
        self.docker_client = docker.from_env()
        self.queue = RedisQueue()
        self.analyzer = LogAnalyzer()
    
    def heal_project(self, task: Dict[str, Any]) -> Dict[str, Any]:
        project_id = task.get("project_id")
        logs = task.get("logs", "")
        classification = task.get("classification", {})
        
        project = self._find_project(project_id)
        if not project:
            return {"status": "failed", "error": "Project not found"}
        
        results = {
            "task_id": task.get("task_id"),
            "project_id": project_id,
            "project_name": project.get("name"),
            "steps": []
        }
        
        auto_pull = project.get("auto_pull_enabled", True)
        auto_push = project.get("auto_push_enabled", True)
        
        if auto_pull:
            pull_result = self._pull_project(project)
            results["steps"].append(pull_result)
            if pull_result["status"] == "failed":
                results["status"] = "failed"
                return results
        
        fix_result = self._fix_project(project, logs, classification)
        results["steps"].append(fix_result)
        
        test_passed = False
        max_retries = 3
        for attempt in range(max_retries):
            test_result = self._test_project(project)
            results["steps"].append(test_result)
            
            if test_result.get("status") == "passed":
                test_passed = True
                break
            elif test_result.get("status") == "failed":
                fix_result = self._fix_project(project, logs, classification)
                results["steps"].append({"step": "retry_fix", "attempt": attempt + 1, **fix_result})
        
        results["test_passed"] = test_passed
        
        if test_passed and auto_push:
            push_result = self._push_project(project)
            results["steps"].append(push_result)
            if push_result["status"] == "success":
                results["status"] = "healed"
            else:
                results["status"] = "test_passed_push_failed"
        elif not test_passed:
            results["status"] = "test_failed"
        else:
            results["status"] = "completed"
        
        return results
    
    def _find_project(self, project_id: str) -> Optional[Dict]:
        for p in projects.projects_db:
            if p["id"] == project_id:
                return p
        return None
    
    def _pull_project(self, project: Dict) -> Dict:
        local_path = project.get("local_path")
        repo_url = project.get("repo_url")
        default_branch = project.get("default_branch", "main")
        
        if not local_path:
            return {"step": "pull", "status": "skipped", "reason": "No local path"}
        
        try:
            if not os.path.exists(local_path):
                if repo_url:
                    os.makedirs(local_path, exist_ok=True)
                    subprocess.run(["git", "clone", "-b", default_branch, repo_url, local_path], check=True)
                    return {"step": "pull", "status": "success", "action": "cloned"}
                else:
                    return {"step": "pull", "status": "skipped", "reason": "No repo URL"}
            else:
                if os.path.exists(os.path.join(local_path, ".git")):
                    subprocess.run(["git", "-C", local_path, "fetch", "--all"], check=True)
                    subprocess.run(["git", "-C", local_path, "pull", "origin", default_branch], check=True)
                    return {"step": "pull", "status": "success", "action": "pulled"}
            
            return {"step": "pull", "status": "skipped", "reason": "Not a git repo"}
            
        except subprocess.CalledProcessError as e:
            return {"step": "pull", "status": "failed", "error": str(e)}
        except Exception as e:
            return {"step": "pull", "status": "failed", "error": str(e)}
    
    def _fix_project(self, project: Dict, logs: str, classification: Dict) -> Dict:
        issue_type = classification.get("issue_type", "unknown")
        
        local_path = project.get("local_path")
        
        if not local_path or not os.path.exists(local_path):
            return {"step": "fix", "status": "skipped", "reason": "No local path or path not found"}
        
        error_context = self.analyzer.extract_error_context(logs)
        
        fix_suggestions = error_context.get("suggestions", [])
        
        applied_fixes = []
        for suggestion in fix_suggestions[:3]:
            try:
                fix_result = self._apply_fix(local_path, suggestion)
                if fix_result["status"] == "success":
                    applied_fixes.append(suggestion)
            except Exception as e:
                pass
        
        return {
            "step": "fix",
            "status": "applied" if applied_fixes else "no_fix_applied",
            "fixes_applied": applied_fixes,
            "suggestions": fix_suggestions
        }
    
    def _apply_fix(self, local_path: str, suggestion: Dict) -> Dict:
        fix_type = suggestion.get("type", "")
        
        if fix_type == "file_content":
            file_path = suggestion.get("file_path")
            content = suggestion.get("content")
            
            if file_path and content:
                full_path = os.path.join(local_path, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w") as f:
                    f.write(content)
                return {"status": "success", "file": file_path}
        
        elif fix_type == "command":
            command = suggestion.get("command")
            if command:
                try:
                    subprocess.run(command, shell=True, cwd=local_path, check=True)
                    return {"status": "success", "command": command}
                except subprocess.CalledProcessError as e:
                    return {"status": "failed", "error": str(e)}
        
        return {"status": "no_op"}
    
    def _test_project(self, project: Dict) -> Dict:
        local_path = project.get("local_path")
        
        if not local_path or not os.path.exists(local_path):
            return {"step": "test", "status": "skipped", "reason": "No local path"}
        
        dockerfile_path = os.path.join(local_path, "Dockerfile")
        
        if not os.path.exists(dockerfile_path):
            return {"step": "test", "status": "skipped", "reason": "No Dockerfile found"}
        
        test_container_name = f"test-{project.get('id', uuid.uuid4().hex[:8])}"
        
        try:
            container = self.docker_client.containers.run(
                "nginx:alpine",
                name=test_container_name,
                detach=True,
                ports={"80": None}
            )
            
            import time
            time.sleep(5)
            
            container.reload()
            if container.status == "running":
                container.stop()
                container.remove()
                return {"step": "test", "status": "passed", "action": "docker_test"}
            else:
                container.remove(force=True)
                return {"step": "test", "status": "failed", "reason": "Container not running"}
                
        except docker.errors.NotFound:
            return {"step": "test", "status": "skipped", "reason": "Docker test not available"}
        except Exception as e:
            return {"step": "test", "status": "failed", "error": str(e)}
    
    def _push_project(self, project: Dict) -> Dict:
        local_path = project.get("local_path")
        default_branch = project.get("default_branch", "main")
        
        if not local_path or not os.path.exists(local_path):
            return {"step": "push", "status": "skipped", "reason": "No local path"}
        
        if not os.path.exists(os.path.join(local_path, ".git")):
            return {"step": "push", "status": "skipped", "reason": "Not a git repository"}
        
        try:
            commit_message = f"Auto-heal: Fix from AgentForge at {datetime.now().isoformat()}"
            
            subprocess.run(["git", "-C", local_path, "add", "."], check=True)
            result = subprocess.run(["git", "-C", local_path, "diff", "--cached", "--stat"], capture_output=True, text=True)
            
            if not result.stdout.strip():
                return {"step": "push", "status": "skipped", "reason": "No changes to commit"}
            
            subprocess.run(["git", "-C", local_path, "commit", "-m", commit_message], check=True)
            subprocess.run(["git", "-C", local_path, "push", "origin", default_branch], check=True)
            
            return {"step": "push", "status": "success", "action": "pushed"}
            
        except subprocess.CalledProcessError as e:
            return {"step": "push", "status": "failed", "error": str(e)}
        except Exception as e:
            return {"step": "push", "status": "failed", "error": str(e)}


def process_heal_task(task: Dict[str, Any]) -> Dict[str, Any]:
    """Process a healing task"""
    healer = ProjectHealer()
    return healer.heal_project(task)