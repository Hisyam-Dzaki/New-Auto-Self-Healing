from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    runtime: str
    path: str
    framework: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    runtime: Optional[str] = None
    framework: Optional[str] = None

@router.post("/projects")
async def create_project(project: ProjectCreate):
    if os.path.exists(project.path):
        raise HTTPException(status_code=400, detail="Project path already exists")
    os.makedirs(project.path)
    # logic to save project metadata
    return {"id": project.name, "status": "created"}

@router.get("/projects")
async def list_projects():
    return {"projects": []}

@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    return {"id": project_id}

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    return {"status": "deleted"}
