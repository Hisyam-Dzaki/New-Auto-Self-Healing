from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import os
import uuid
import subprocess

from ..models.database import get_db, Project

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

def generate_slug(name: str) -> str:
    return name.lower().replace(" ", "-") + "-" + uuid.uuid4().hex[:8]

def _serialize(p: Project) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "source_type": p.source_type,
        "repo_url": p.repo_url,
        "local_path": p.local_path,
        "default_branch": p.default_branch,
        "auto_healing_enabled": p.auto_healing_enabled,
        "auto_pull_enabled": p.auto_pull_enabled,
        "auto_push_enabled": p.auto_push_enabled,
        "status": p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

async def _get_or_404(db: AsyncSession, project_id: str) -> Project:
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")
    result = await db.execute(select(Project).where(Project.id == pid))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/projects")
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    slug = generate_slug(project.name)

    local_path = project.local_path
    if not local_path:
        local_path = f"{PROJECTS_BASE}/{slug}"

    if project.source_type == "local" and project.local_path:
        if not os.path.exists(project.local_path):
            raise HTTPException(status_code=400, detail="Local path does not exist")

    new_project = Project(
        name=project.name,
        slug=slug,
        description=project.description,
        source_type=project.source_type,
        repo_url=project.repo_url,
        local_path=local_path,
        default_branch=project.default_branch,
        auto_healing_enabled=project.auto_healing_enabled,
        auto_pull_enabled=project.auto_pull_enabled,
        auto_push_enabled=project.auto_push_enabled,
        status="idle",
    )

    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    return _serialize(new_project)

@router.get("/projects")
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return {"projects": [_serialize(p) for p in projects]}

@router.get("/projects/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await _get_or_404(db, project_id)
    return _serialize(project)

@router.put("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    existing = await _get_or_404(db, project_id)

    update_data = project.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    await db.commit()
    await db.refresh(existing)
    return _serialize(existing)

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    existing = await _get_or_404(db, project_id)
    await db.delete(existing)
    await db.commit()
    return {"status": "deleted"}

@router.post("/projects/{project_id}/pull")
async def pull_project(project_id: str, db: AsyncSession = Depends(get_db)):
    p = await _get_or_404(db, project_id)

    if p.source_type != "github" or not p.repo_url:
        raise HTTPException(status_code=400, detail="Project is not a GitHub project")

    try:
        if not os.path.exists(p.local_path):
            os.makedirs(p.local_path, exist_ok=True)
            subprocess.run(["git", "clone", p.repo_url, p.local_path], check=True)
        else:
            subprocess.run(["git", "-C", p.local_path, "fetch", "--all"], check=True)
            subprocess.run(["git", "-C", p.local_path, "pull", "origin", p.default_branch], check=True)

        p.status = "pulled"
        await db.commit()
        return {"status": "success", "message": "Repository pulled successfully"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git operation failed: {str(e)}")

@router.post("/projects/{project_id}/push")
async def push_project(project_id: str, commit_message: str = "Auto-heal fix", db: AsyncSession = Depends(get_db)):
    p = await _get_or_404(db, project_id)

    if not os.path.exists(p.local_path):
        raise HTTPException(status_code=400, detail="Local path does not exist")

    try:
        subprocess.run(["git", "-C", p.local_path, "add", "."], check=True)
        subprocess.run(["git", "-C", p.local_path, "commit", "-m", commit_message], check=True)
        subprocess.run(["git", "-C", p.local_path, "push", "origin", p.default_branch], check=True)

        p.status = "pushed"
        await db.commit()
        return {"status": "success", "message": "Changes pushed successfully"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git operation failed: {str(e)}")

@router.get("/projects/{project_id}/branches")
async def get_branches(project_id: str, db: AsyncSession = Depends(get_db)):
    p = await _get_or_404(db, project_id)

    if not p.local_path or not os.path.exists(p.local_path):
        raise HTTPException(status_code=400, detail="Local repository not found")

    try:
        result = subprocess.run(
            ["git", "-C", p.local_path, "branch", "-a"],
            capture_output=True, text=True, check=True
        )
        branches = [b.strip().replace("* ", "") for b in result.stdout.split("\n") if b.strip()]
        return {"branches": branches}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git operation failed: {str(e)}")
