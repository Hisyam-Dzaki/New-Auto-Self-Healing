import docker
from typing import Optional, Dict, List, AsyncGenerator
import asyncio

class DockerSandbox:
    def __init__(self):
        self.client = None
        self.allowed_commands = [
            "git", "npm", "node", "python", "python3", "pip", 
            "docker", "ls", "cat", "echo", "mkdir", "cd", "curl",
            "apt-get", "yarn", "go", "cargo", "rustc", "make"
        ]
        self.blocked_patterns = [
            "rm -rf /", "rm -rf /*", "shutdown", "reboot", "mkfs",
            "dd if=", ":(){:|:&};:", "nohup", "&>/dev/null"
        ]
    
    def _validate_command(self, command: str) -> bool:
        cmd_lower = command.lower()
        
        for pattern in self.blocked_patterns:
            if pattern in cmd_lower:
                return False
        
        cmd_parts = command.strip().split()
        if cmd_parts:
            base_cmd = cmd_parts[0].split('/')[-1]
            if base_cmd not in self.allowed_commands:
                return False
        
        return True
    
    def _get_resource_limits(self) -> Dict:
        import os
        return {
            "memory": os.getenv("DOCKER_MEMORY_LIMIT", "4g"),
            "cpu_period": 100000,
            "cpu_quota": int(os.getenv("DOCKER_CPU_LIMIT", "2")) * 50000,
            "pids_limit": 512,
            "network_mode": "bridge"
        }
    
    def get_allowed_volumes(self) -> List[Dict]:
        return [
            {"bind": "/projects", "mode": "rw"},
            {"bind": "/data", "mode": "rw"},
            {"bind": "/logs", "mode": "rw"}
        ]
    
    def get_forbidden_capabilities(self) -> List[str]:
        return [
            "NET_ADMIN",
            "SYS_ADMIN", 
            "SYS_MODULE",
            "SYS_RAWIO",
            "DAC_READ_SEARCH",
            "DAC_OVERRIDE",
            "FOWNER",
            "SETFCAP"
        ]


class DockerTool:
    name = "docker"
    description = "Docker container management"
    
    def __init__(self):
        self.client = docker.from_env()
        self.sandbox = DockerSandbox()
    
    async def execute(self, input: Dict) -> Dict:
        action = input.get("action")
        
        if action == "build":
            return await self._build_image(input)
        elif action == "run":
            return await self._run_container(input)
        elif action == "stop":
            return await self._stop_container(input)
        elif action == "restart":
            return await self._restart_container(input)
        elif action == "logs":
            return await self._get_container_logs(input)
        elif action == "status":
            return await self._get_container_status(input)
        elif action == "list":
            return await self._list_containers(input)
        elif action == "remove":
            return await self._remove_container(input)
        elif action == "exec":
            return await self._exec_in_container(input)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _build_image(self, input: Dict) -> Dict:
        project_path = input.get("path")
        tag = input.get("tag", "agentforge/app:latest")
        dockerfile = input.get("dockerfile", "Dockerfile")
        
        try:
            image, logs = self.client.images.build(
                path=project_path,
                dockerfile=dockerfile,
                tag=tag,
                rm=True,
                forcerm=True
            )
            
            log_output = []
            for log in logs:
                if 'stream' in log:
                    log_output.append(log['stream'])
            
            return {
                "status": "built",
                "image_id": image.id,
                "tag": tag,
                "logs": log_output
            }
        except docker.errors.BuildError as e:
            return {"status": "error", "error": str(e), "logs": e.build_log}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _run_container(self, input: Dict) -> Dict:
        image = input.get("image")
        name = input.get("name")
        ports = input.get("ports", {})
        environment = input.get("environment", {})
        volumes = input.get("volumes", [])
        
        container_name = name or f"agentforge-{image.replace('/', '-')}"
        
        resources = self.sandbox._get_resource_limits()
        
        host_config = self.client.api.create_host_config(
            port_bindings=ports,
            mem_limit=resources["memory"],
            cpu_period=resources["cpu_period"],
            cpu_quota=resources["cpu_quota"],
            pids_limit=resources["pids_limit"],
            network_mode=resources["network_mode"],
            binds=[f"{v['bind']}:{v['bind']}" for v in self.sandbox.get_allowed_volumes()] + volumes
        )
        
        try:
            container = self.client.containers.run(
                image,
                name=container_name,
                detach=True,
                ports=ports,
                environment=environment,
                host_config=host_config,
                auto_remove=False
            )
            
            return {
                "status": "running",
                "container_id": container.id,
                "container_name": container_name
            }
        except docker.errors.APIError as e:
            return {"status": "error", "error": str(e)}
    
    async def _stop_container(self, input: Dict) -> Dict:
        container_id = input.get("container_id") or input.get("name")
        
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=30)
            
            return {"status": "stopped", "container": container_id}
        except docker.errors.NotFound:
            return {"status": "error", "error": "Container not found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _restart_container(self, input: Dict) -> Dict:
        container_id = input.get("container_id") or input.get("name")
        
        try:
            container = self.client.containers.get(container_id)
            container.restart(timeout=30)
            
            return {"status": "restarted", "container": container_id}
        except docker.errors.NotFound:
            return {"status": "error", "error": "Container not found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _get_container_logs(self, input: Dict) -> Dict:
        container_id = input.get("container_id") or input.get("name")
        tail = input.get("tail", 100)
        stream = input.get("stream", False)
        
        try:
            container = self.client.containers.get(container_id)
            
            if stream:
                return {"status": "streaming", "logs": container.logs(stream=True, follow=True).decode('utf-8')}
            else:
                logs = container.logs(tail=tail).decode('utf-8')
                return {"status": "ok", "logs": logs.split('\n'), "tail": tail}
        except docker.errors.NotFound:
            return {"status": "error", "error": "Container not found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _get_container_status(self, input: Dict) -> Dict:
        container_id = input.get("container_id") or input.get("name")
        
        try:
            container = self.client.containers.get(container_id)
            
            return {
                "status": "ok",
                "container_id": container.id,
                "name": container.name,
                "state": container.status,
                "image": container.image.tags[0] if container.image.tags else "unknown",
                "created": container.attrs.get("Created"),
                "ports": container.ports
            }
        except docker.errors.NotFound:
            return {"status": "error", "error": "Container not found"}
    
    async def _list_containers(self, input: Dict) -> Dict:
        all_containers = input.get("all", False)
        
        containers = self.client.containers.list(all=all_containers)
        
        result = []
        for c in containers:
            result.append({
                "id": c.id[:12],
                "name": c.name,
                "status": c.status,
                "image": c.image.tags[0] if c.image.tags else "unknown",
                "created": c.attrs.get("Created")
            })
        
        return {"status": "ok", "containers": result, "count": len(result)}
    
    async def _remove_container(self, input: Dict) -> Dict:
        container_id = input.get("container_id") or input.get("name")
        force = input.get("force", False)
        
        try:
            container = self.client.containers.get(container_id)
            container.remove(force=force)
            
            return {"status": "removed", "container": container_id}
        except docker.errors.NotFound:
            return {"status": "error", "error": "Container not found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _exec_in_container(self, input: Dict) -> Dict:
        container_id = input.get("container_id") or input.get("name")
        command = input.get("command", [])
        
        if isinstance(command, str):
            command = command.split()
        
        if not self.sandbox._validate_command(" ".join(command)):
            return {"status": "error", "error": "Command not allowed"}
        
        try:
            container = self.client.containers.get(container_id)
            
            result = container.exec_run(command, demux=True)
            
            return {
                "status": "executed",
                "exit_code": result.exit_code,
                "stdout": result.output[0].decode('utf-8') if result.output[0] else "",
                "stderr": result.output[1].decode('utf-8') if result.output[1] else ""
            }
        except docker.errors.NotFound:
            return {"status": "error", "error": "Container not found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}