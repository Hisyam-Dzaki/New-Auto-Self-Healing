from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    framework: str
    runtime: str
    path: Optional[str] = None
    ports: List[str] = []

class ProjectResponse(BaseModel):
    id: str
    name: str
    framework: str
    runtime: str
    path: str
    status: str
    ports: List[str]
    createdAt: str

projects_db = {}

@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    project_id = datetime.now().strftime("%Y%m%d%H%M%S")
    new_project = ProjectResponse(
        id=project_id,
        name=project.name,
        framework=project.framework,
        runtime=project.runtime,
        path=project.path or f"/projects/{project.name}",
        status="stopped",
        ports=project.ports,
        createdAt=datetime.now().isoformat()
    )
    projects_db[project_id] = new_project
    return new_project

@router.get("/", response_model=List[ProjectResponse])
async def list_projects():
    return list(projects_db.values())

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    return projects_db[project_id]

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    del projects_db[project_id]
    return {"status": "deleted"}

@router.post("/{project_id}/clone")
async def clone_project(project_id: str, new_name: str):
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    source = projects_db[project_id]
    project_id = datetime.now().strftime("%Y%m%d%H%M%S")
    new_project = ProjectResponse(
        id=project_id,
        name=new_name,
        framework=source.framework,
        runtime=source.runtime,
        path=f"/projects/{new_name}",
        status="stopped",
        ports=source.ports,
        createdAt=datetime.now().isoformat()
    )
    projects_db[project_id] = new_project
    return new_project

@router.post("/{project_id}/archive")
async def archive_project(project_id: str):
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "archived"}