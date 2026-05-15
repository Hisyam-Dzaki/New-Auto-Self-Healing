from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import asyncio

router = APIRouter()

class ContainerRequest(BaseModel):
    project_id: str
    ports: Optional[Dict[str, str]] = None
    limits: Optional[Dict[str, str]] = None

@router.post("/build")
async def build_image(project_id: str, dockerfile: str = "Dockerfile"):
    from ..execution.docker_executor import DockerExecutor
    executor = DockerExecutor()
    
    result_lines = []
    async for line in executor.build_image(project_id, dockerfile):
        result_lines.append(line)
    
    return {"status": "completed", "logs": result_lines}

@router.post("/run")
async def run_container(request: ContainerRequest):
    from ..execution.docker_executor import DockerExecutor
    executor = DockerExecutor()
    
    container_id = await executor.run_container(
        request.project_id,
        request.ports,
        request.limits
    )
    
    return {"container_id": container_id, "status": "running"}

@router.post("/stop/{project_id}")
async def stop_container(project_id: str):
    from ..execution.docker_executor import DockerExecutor
    executor = DockerExecutor()
    
    result = await executor.stop_container(project_id)
    return {"message": result}

@router.post("/restart/{project_id}")
async def restart_container(project_id: str):
    from ..execution.docker_executor import DockerExecutor
    executor = DockerExecutor()
    
    result = await executor.restart_container(project_id)
    return {"message": result}

@router.get("/logs/{project_id}")
async def get_container_logs(project_id: str, tail: int = 100):
    from ..execution.docker_executor import DockerExecutor
    executor = DockerExecutor()
    
    logs = await executor.get_logs(project_id, tail)
    return {"logs": logs}