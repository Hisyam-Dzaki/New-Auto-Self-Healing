from typing import Dict, Any, List
from .base import BaseTool
from .file_system import FileSystemTools

class FileTools(BaseTool):
    name = "file_tools"
    description = "Read, write, edit, and search files in project"
    
    def __init__(self, project_id: str = None):
        self.project_id = project_id or "default"
        self.fs_tools = FileSystemTools(project_id=self.project_id)
    
    async def execute(self, input: Dict[str, Any]) -> Any:
        action = input.get("action")
        
        if action == "read":
            return await self._read_file(input)
        elif action == "write":
            return await self._write_file(input)
        elif action == "edit":
            return await self._edit_file(input)
        elif action == "search":
            return await self._search_files(input)
        elif action == "list":
            return await self._list_files(input)
        elif action == "delete":
            return await self._delete_file(input)
        elif action == "create_dir":
            return await self._create_directory(input)
        elif action == "copy":
            return await self._copy_file(input)
        elif action == "move":
            return await self._move_file(input)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _read_file(self, input: Dict) -> Dict:
        file_path = input.get("path")
        
        if not file_path:
            return {"error": "Path is required"}
        
        try:
            content = self.fs_tools.read_file(file_path)
            return {
                "status": "ok",
                "path": file_path,
                "content": content,
                "size": len(content)
            }
        except FileNotFoundError as e:
            return {"status": "error", "error": str(e)}
        except ValueError as e:
            return {"status": "error", "error": str(e)}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _write_file(self, input: Dict) -> Dict:
        file_path = input.get("path")
        content = input.get("content", "")
        
        if not file_path:
            return {"error": "Path is required"}
        
        if not content:
            return {"error": "Content is required"}
        
        try:
            result = self.fs_tools.write_file(file_path, content)
            return {
                "status": "ok",
                "result": result,
                "path": file_path,
                "size": len(content)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _edit_file(self, input: Dict) -> Dict:
        file_path = input.get("path")
        old_content = input.get("old_content")
        new_content = input.get("new_content")
        
        if not all([file_path, old_content, new_content]):
            return {"error": "path, old_content, and new_content are required"}
        
        try:
            result = self.fs_tools.edit_file(file_path, old_content, new_content)
            return {
                "status": "ok",
                "result": result,
                "path": file_path
            }
        except FileNotFoundError as e:
            return {"status": "error", "error": str(e)}
        except ValueError as e:
            return {"status": "error", "error": str(e)}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _search_files(self, input: Dict) -> Dict:
        pattern = input.get("pattern")
        file_extension = input.get("extension")
        
        if not pattern:
            return {"error": "Pattern is required"}
        
        try:
            results = self.fs_tools.search_codebase(pattern, file_extension)
            return {
                "status": "ok",
                "pattern": pattern,
                "results": results,
                "count": len(results)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _list_files(self, input: Dict) -> Dict:
        directory = input.get("directory", ".")
        
        try:
            files = self.fs_tools.list_files(directory)
            return {
                "status": "ok",
                "directory": directory,
                "files": files,
                "count": len(files)
            }
        except FileNotFoundError as e:
            return {"status": "error", "error": str(e)}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _delete_file(self, input: Dict) -> Dict:
        file_path = input.get("path")
        
        if not file_path:
            return {"error": "Path is required"}
        
        try:
            result = self.fs_tools.delete_file(file_path)
            return {
                "status": "ok",
                "result": result
            }
        except FileNotFoundError as e:
            return {"status": "error", "error": str(e)}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _create_directory(self, input: Dict) -> Dict:
        directory = input.get("path")
        
        if not directory:
            return {"error": "Path is required"}
        
        try:
            safe_path = self.fs_tools._validate_path(directory)
            safe_path.mkdir(parents=True, exist_ok=True)
            return {
                "status": "ok",
                "path": str(safe_path)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _copy_file(self, input: Dict) -> Dict:
        source = input.get("source")
        destination = input.get("destination")
        
        if not all([source, destination]):
            return {"error": "Source and destination are required"}
        
        try:
            import shutil
            src_path = self.fs_tools._validate_path(source)
            dst_path = self.fs_tools._validate_path(destination)
            
            shutil.copy2(src_path, dst_path)
            return {
                "status": "ok",
                "source": source,
                "destination": destination
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _move_file(self, input: Dict) -> Dict:
        source = input.get("source")
        destination = input.get("destination")
        
        if not all([source, destination]):
            return {"error": "Source and destination are required"}
        
        try:
            import shutil
            src_path = self.fs_tools._validate_path(source)
            dst_path = self.fs_tools._validate_path(destination)
            
            shutil.move(str(src_path), str(dst_path))
            return {
                "status": "ok",
                "source": source,
                "destination": destination
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}