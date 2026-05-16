from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import subprocess
import requests
import uuid

router = APIRouter()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
PROJECTS_BASE = "/projects"

github_tokens_db = {}

class GitHubOAuth(BaseModel):
    code: str

class GitHubTokenResponse(BaseModel):
    access_token: str
    token_type: str
    scope: str

class GitHubRepo(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    description: Optional[str]
    default_branch: str
    private: bool

class GitHubUser(BaseModel):
    login: str
    name: str
    avatar_url: str

class CloneRepoRequest(BaseModel):
    repo_url: str
    local_path: str
    branch: str = "main"

@router.get("/github/auth/url")
async def get_auth_url():
    if not GITHUB_CLIENT_ID:
        return {
            "auth_url": None,
            "message": "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET env vars."
        }
    
    auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=repo"
    return {"auth_url": auth_url}

@router.post("/github/oauth/callback")
async def oauth_callback(oauth: GitHubOAuth):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": oauth.code
    }
    
    response = requests.post(token_url, headers=headers, json=data)
    token_data = response.json()
    
    if "access_token" not in token_data:
        raise HTTPException(status_code=400, detail="Failed to get access token")
    
    access_token = token_data["access_token"]
    token_id = str(uuid.uuid4())
    github_tokens_db[token_id] = access_token
    
    return {
        "token_id": token_id,
        "access_token": access_token,
        "token_type": token_data.get("token_type", "bearer"),
        "scope": token_data.get("scope", "")
    }

@router.get("/github/user")
async def get_github_user(token_id: str):
    if token_id not in github_tokens_db:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    access_token = github_tokens_db[token_id]
    headers = {"Authorization": f"token {access_token}"}
    
    response = requests.get("https://api.github.com/user", headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get user info")
    
    user_data = response.json()
    return GitHubUser(
        login=user_data.get("login", ""),
        name=user_data.get("name", ""),
        avatar_url=user_data.get("avatar_url", "")
    )

@router.get("/github/repos")
async def list_repos(token_id: str, page: int = 1, per_page: int = 30):
    if token_id not in github_tokens_db:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    access_token = github_tokens_db[token_id]
    headers = {"Authorization": f"token {access_token}"}
    
    response = requests.get(
        f"https://api.github.com/user/repos?page={page}&per_page={per_page}&sort=updated",
        headers=headers
    )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch repositories")
    
    repos_data = response.json()
    repos = [GitHubRepo(
        id=r.get("id"),
        name=r.get("name", ""),
        full_name=r.get("full_name", ""),
        html_url=r.get("html_url", ""),
        description=r.get("description"),
        default_branch=r.get("default_branch", "main"),
        private=r.get("private", False)
    ) for r in repos_data]
    
    return {"repos": [r.model_dump() for r in repos]}

@router.post("/github/clone")
async def clone_repo(request: CloneRepoRequest, token_id: str):
    if token_id not in github_tokens_db:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    access_token = github_tokens_db[token_id]
    
    try:
        if os.path.exists(request.local_path):
            return {"status": "exists", "message": "Repository already exists at path"}
        
        os.makedirs(request.local_path, exist_ok=True)
        
        repo_url_with_token = request.repo_url.replace("https://", f"https://{access_token}@")
        
        subprocess.run(["git", "clone", "-b", request.branch, "--single-branch", repo_url_with_token, request.local_path], check=True)
        
        result = subprocess.run(
            ["git", "-C", request.local_path, "branch", "-a"],
            capture_output=True, text=True, check=True
        )
        branches = [b.strip().replace("* ", "") for b in result.stdout.split("\n") if b.strip()]
        
        return {
            "status": "success",
            "message": "Repository cloned successfully",
            "branches": branches
        }
    
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git clone failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clone repository: {str(e)}")

@router.get("/github/token/status")
async def get_token_status(token_id: str):
    if token_id not in github_tokens_db:
        return {"connected": False}
    
    access_token = github_tokens_db[token_id]
    headers = {"Authorization": f"token {access_token}"}
    
    response = requests.get("https://api.github.com/user", headers=headers)
    
    if response.status_code == 200:
        user_data = response.json()
        return {
            "connected": True,
            "username": user_data.get("login"),
            "name": user_data.get("name")
        }
    
    return {"connected": False}

@router.post("/github/logout")
async def logout(token_id: str):
    if token_id in github_tokens_db:
        del github_tokens_db[token_id]
    return {"status": "logged out"}