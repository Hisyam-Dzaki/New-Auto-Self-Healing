import docker
from typing import Optional, AsyncGenerator
import asyncio

class DockerExecutor:
    ALLOWED_COMMANDS = ["docker", "git", "npm", "node", "python", "pip", "go", "cargo"]
    BLOCKED_PATTERNS = ["rm -rf /", "shutdown", "init 0", ":(){:|:&};:"]
    
    def __init__(self):
        self.client = docker.from_env()
        self.active_containers = {}
        
    def _validate_command(self, command: str) -> bool:
        for pattern in self.BLOCKED_PATTERNS:
            if pattern in command.lower():
                return False
        return True
    
    async def build_image(self, project_id: str, dockerfile_path: str = "Dockerfile") -> AsyncGenerator[str, None]:
        yield f"Building image for project {project_id}...\n"
        
        try:
            image, logs = self.client.images.build(
                path=f"/projects/{project_id}",
                dockerfile=dockerfile_path,
                tag=f"agentforge/{project_id}:latest"
            )
            
            for log in logs:
                if 'stream' in log:
                    yield f"{log['stream']}"
                    
            yield "Build completed successfully.\n"
            
        except docker.errors.BuildError as e:
            yield f"Build failed: {e}\n"
        except Exception as e:
            yield f"Error: {e}\n"
    
    async def run_container(
        self, 
        project_id: str, 
        ports: dict = None,
        limits: dict = None
    ) -> str:
        container_name = f"agentforge-{project_id}"
        
        try:
            existing = self.client.containers.list(filters={"name": container_name})
            if existing:
                existing[0].remove(force=True)
            
            host_config = self.client.api.create_host_config(
                port_bindings=ports,
                mem_limit=limits.get("memory", "512m") if limits else "512m",
                cpu_period=100000,
                cpu_quota=50000
            )
            
            container = self.client.containers.run(
                f"agentforge/{project_id}:latest",
                name=container_name,
                detach=True,
                ports=ports,
                host_config=host_config
            )
            
            self.active_containers[project_id] = container.id
            return container.id
            
        except docker.errors.APIError as e:
            return f"Error: {e}"
    
    async def stop_container(self, project_id: str) -> str:
        container_name = f"agentforge-{project_id}"
        try:
            container = self.client.containers.get(container_name)
            container.stop()
            return "Container stopped"
        except docker.errors.NotFound:
            return "Container not found"
    
    async def get_logs(self, project_id: str, tail: int = 100) -> str:
        container_name = f"agentforge-{project_id}"
        try:
            container = self.client.containers.get(container_name)
            logs = container.logs(tail=tail).decode('utf-8')
            return logs
        except docker.errors.NotFound:
            return "Container not found"
    
    async def restart_container(self, project_id: str) -> str:
        container_name = f"agentforge-{project_id}"
        try:
            container = self.client.containers.get(container_name)
            container.restart()
            return "Container restarted"
        except docker.errors.NotFound:
            return "Container not found"