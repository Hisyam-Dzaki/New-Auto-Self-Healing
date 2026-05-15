from typing import Dict, Any, Optional
from .base import BaseTool
import os

class ProjectTool(BaseTool):
    name = "project"
    description = "CRUD operations for projects"
    
    async def execute(self, input: Dict[str, Any]) -> Any:
        action = input.get("action")
        
        if action == "create":
            return await self._create_project(input)
        elif action == "read":
            return await self._read_project(input)
        elif action == "update":
            return await self._update_project(input)
        elif action == "delete":
            return await self._delete_project(input)
        elif action == "list":
            return await self._list_projects(input)
        elif action == "archive":
            return await self._archive_project(input)
        elif action == "clone":
            return await self._clone_project(input)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _create_project(self, input: Dict) -> Dict:
        name = input.get("name")
        runtime = input.get("runtime", "python")
        framework = input.get("framework")
        base_path = input.get("base_path", "/projects")
        
        project_path = os.path.join(base_path, name)
        
        if os.path.exists(project_path):
            return {"error": "Project already exists"}
        
        os.makedirs(project_path, exist_ok=True)
        
        if runtime == "python":
            self._create_python_template(project_path, framework)
        elif runtime == "node":
            self._create_node_template(project_path, framework)
        elif runtime == "go":
            self._create_go_template(project_path)
        
        return {
            "status": "created",
            "path": project_path,
            "name": name
        }
    
    async def _read_project(self, input: Dict) -> Dict:
        project_path = input.get("path")
        if not os.path.exists(project_path):
            return {"error": "Project not found"}
        
        files = []
        for root, dirs, filenames in os.walk(project_path):
            for f in filenames:
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, project_path)
                files.append(rel_path)
        
        return {"files": files, "path": project_path}
    
    async def _update_project(self, input: Dict) -> Dict:
        project_path = input.get("path")
        updates = input.get("updates", {})
        
        if "name" in updates:
            new_path = os.path.join(os.path.dirname(project_path), updates["name"])
            os.rename(project_path, new_path)
            project_path = new_path
        
        return {"status": "updated", "path": project_path}
    
    async def _delete_project(self, input: Dict) -> Dict:
        import shutil
        project_path = input.get("path")
        
        if os.path.exists(project_path):
            shutil.rmtree(project_path)
            return {"status": "deleted", "path": project_path}
        
        return {"error": "Project not found"}
    
    async def _list_projects(self, input: Dict) -> Dict:
        base_path = input.get("base_path", "/projects")
        
        if not os.path.exists(base_path):
            return {"projects": []}
        
        projects = []
        for item in os.listdir(base_path):
            item_path = os.path.join(base_path, item)
            if os.path.isdir(item_path):
                projects.append({
                    "name": item,
                    "path": item_path
                })
        
        return {"projects": projects}
    
    async def _archive_project(self, input: Dict) -> Dict:
        import shutil
        project_path = input.get("path")
        archive_path = input.get("archive_path")
        
        shutil.make_archive(archive_path, "zip", project_path)
        return {"status": "archived", "archive": archive_path}
    
    async def _clone_project(self, input: Dict) -> Dict:
        import shutil
        source_path = input.get("source")
        dest_path = input.get("destination")
        
        shutil.copytree(source_path, dest_path)
        return {"status": "cloned", "destination": dest_path}
    
    def _create_python_template(self, path: str, framework: str):
        if framework == "fastapi":
            os.makedirs(os.path.join(path, "app"))
            with open(os.path.join(path, "app", "main.py"), "w") as f:
                f.write('from fastapi import FastAPI\napp = FastAPI()\n')
            with open(os.path.join(path, "requirements.txt"), "w") as f:
                f.write("fastapi\nuvicorn\n")
        elif framework == "flask":
            with open(os.path.join(path, "app.py"), "w") as f:
                f.write('from flask import Flask\napp = Flask(__name__)\n')
            with open(os.path.join(path, "requirements.txt"), "w") as f:
                f.write("flask\n")
        else:
            with open(os.path.join(path, "main.py"), "w") as f:
                f.write("# Main application\n")
    
    def _create_node_template(self, path: str, framework: str):
        with open(os.path.join(path, "package.json"), "w") as f:
            f.write('{"name": "app", "scripts": {"start": "node index.js"}}\n')
        with open(os.path.join(path, "index.js"), "w") as f:
            f.write('console.log("Hello World");\n')
    
    def _create_go_template(self, path: str):
        os.makedirs(os.path.join(path, "cmd"))
        with open(os.path.join(path, "go.mod"), "w") as f:
            f.write("module app\ngo 1.21\n")
        with open(os.path.join(path, "cmd", "main.go"), "w") as f:
            f.write("package main\nfunc main() {}\n")