from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import subprocess
from pathlib import Path

router = APIRouter()

PROJECTS_BASE = "/projects"

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    source_type: str = "local"
    repo_url: Optional[str] = None
    local_path: Optional[str] = None
    default_branch: str = "main"
    auto_healing_enabled: bool = False
    auto_pull_enabled: bool = True
    auto_push_enabled: bool = True

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[str] = None
    repo_url: Optional[str] = None
    local_path: Optional[str] = None
    default_branch: Optional[str] = None
    auto_healing_enabled: Optional[bool] = None
    auto_pull_enabled: Optional[bool] = None
    auto_push_enabled: Optional[bool] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    source_type: str
    repo_url: Optional[str]
    local_path: Optional[str]
    default_branch: str
    auto_healing_enabled: bool
    auto_pull_enabled: bool
    auto_push_enabled: bool
    status: str
    created_at: str

projects_db: List[dict] = []

def generate_slug(name: str) -> str:
    return name.lower().replace(" ", "-") + "-" + uuid.uuid4().hex[:8]

@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    project_id = str(uuid.uuid4())
    slug = generate_slug(project.name)
    
    local_path = project.local_path
    if not local_path:
        local_path = f"{PROJECTS_BASE}/{slug}"
    
    if project.source_type == "local" and project.local_path:
        if not os.path.exists(project.local_path):
            raise HTTPException(status_code=400, detail="Local path does not exist")
    
    new_project = {
        "id": project_id,
        "name": project.name,
        "slug": slug,
        "description": project.description,
        "source_type": project.source_type,
        "repo_url": project.repo_url,
        "local_path": local_path,
        "default_branch": project.default_branch,
        "auto_healing_enabled": project.auto_healing_enabled,
        "auto_pull_enabled": project.auto_pull_enabled,
        "auto_push_enabled": project.auto_push_enabled,
        "status": "idle",
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    projects_db.append(new_project)
    
    return ProjectResponse(**new_project)

@router.get("/projects")
async def list_projects():
    return {"projects": projects_db}

@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    for p in projects_db:
        if p["id"] == project_id:
            return p
    raise HTTPException(status_code=404, detail="Project not found")

@router.put("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectUpdate):
    for i, p in enumerate(projects_db):
        if p["id"] == project_id:
            update_data = project.model_dump(exclude_unset=True)
            projects_db[i].update(update_data)
            return projects_db[i]
    raise HTTPException(status_code=404, detail="Project not found")

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    for i, p in enumerate(projects_db):
        if p["id"] == project_id:
            projects_db.pop(i)
            return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Project not found")

@router.post("/projects/{project_id}/pull")
async def pull_project(project_id: str):
    for p in projects_db:
        if p["id"] == project_id:
            if p["source_type"] != "github" or not p.get("repo_url"):
                raise HTTPException(status_code=400, detail="Project is not a GitHub project")
            
            try:
                if not os.path.exists(p["local_path"]):
                    os.makedirs(p["local_path"], exist_ok=True)
                    subprocess.run(["git", "clone", p["repo_url"], p["local_path"]], check=True)
                else:
                    subprocess.run(["git", "-C", p["local_path"], "fetch", "--all"], check=True)
                    subprocess.run(["git", "-C", p["local_path"], "pull", "origin", p["default_branch"]], check=True)
                
                p["status"] = "pulled"
                return {"status": "success", "message": "Repository pulled successfully"}
            except subprocess.CalledProcessError as e:
                raise HTTPException(status_code=500, detail=f"Git operation failed: {str(e)}")
    
    raise HTTPException(status_code=404, detail="Project not found")

@router.post("/projects/{project_id}/push")
async def push_project(project_id: str, commit_message: str = "Auto-heal fix"):
    for p in projects_db:
        if p["id"] == project_id:
            if not os.path.exists(p["local_path"]):
                raise HTTPException(status_code=400, detail="Local path does not exist")
            
            try:
                subprocess.run(["git", "-C", p["local_path"], "add", "."], check=True)
                subprocess.run(["git", "-C", p["local_path"], "commit", "-m", commit_message], check=True)
                subprocess.run(["git", "-C", p["local_path"], "push", "origin", p["default_branch"]], check=True)
                
                p["status"] = "pushed"
                return {"status": "success", "message": "Changes pushed successfully"}
            except subprocess.CalledProcessError as e:
                raise HTTPException(status_code=500, detail=f"Git operation failed: {str(e)}")
    
    raise HTTPException(status_code=404, detail="Project not found")

@router.get("/projects/{project_id}/branches")
async def get_branches(project_id: str):
    for p in projects_db:
        if p["id"] == project_id:
            if not p.get("local_path") or not os.path.exists(p["local_path"]):
                raise HTTPException(status_code=400, detail="Local repository not found")
            
            try:
                result = subprocess.run(
                    ["git", "-C", p["local_path"], "branch", "-a"],
                    capture_output=True, text=True, check=True
                )
                branches = [b.strip().replace("* ", "") for b in result.stdout.split("\n") if b.strip()]
                return {"branches": branches}
            except subprocess.CalledProcessError as e:
                raise HTTPException(status_code=500, detail=f"Git operation failed: {str(e)}")
    
    raise HTTPException(status_code=404, detail="Project not found")