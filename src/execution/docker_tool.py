import docker
from typing import Optional

class DockerExecutor:
    def __init__(self):
        self.client = docker.from_env()

    def build_image(self, path: str, tag: str):
        return self.client.images.build(path=path, tag=tag)

    def run_container(
        self, 
        image: str, 
        command: Optional[str] = None,
        mem_limit: str = "512m",
        cpu_period: int = 100000,
        cpu_quota: int = 50000
    ):
        return self.client.containers.run(
            image, 
            command=command, 
            detach=True,
            mem_limit=mem_limit,
            cpu_period=cpu_period,
            cpu_quota=cpu_quota
        )

    def stop_container(self, container_id: str):
        container = self.client.containers.get(container_id)
        return container.stop()

    def get_logs(self, container_id: str):
        container = self.client.containers.get(container_id)
        return container.logs()
