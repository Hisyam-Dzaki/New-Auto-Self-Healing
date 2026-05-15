import os
import re
from pathlib import Path
from typing import List, Optional

class FileSystemTools:
    ALLOWED_BASE_PATH = "/projects"
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    def __init__(self, project_id: str):
        self.project_path = Path(self.ALLOWED_BASE_PATH) / project_id
        self.project_path.mkdir(parents=True, exist_ok=True)
    
    def _validate_path(self, file_path: str) -> Path:
        full_path = (self.project_path / file_path).resolve()
        if not str(full_path).startswith(str(self.project_path)):
            raise ValueError("Path traversal detected")
        return full_path
    
    def read_file(self, file_path: str) -> str:
        path = self._validate_path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if path.stat().st_size > self.MAX_FILE_SIZE:
            raise ValueError("File too large")
        
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def write_file(self, file_path: str, content: str) -> str:
        path = self._validate_path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return f"File written: {file_path}"
    
    def edit_file(self, file_path: str, old_content: str, new_content: str) -> str:
        path = self._validate_path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if old_content not in content:
            raise ValueError("Old content not found in file")
        
        updated_content = content.replace(old_content, new_content, 1)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        return f"File edited: {file_path}"
    
    def search_codebase(self, pattern: str, file_extension: Optional[str] = None) -> List[dict]:
        results = []
        search_pattern = re.compile(pattern, re.IGNORECASE)
        
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file_extension and not file.endswith(file_extension):
                    continue
                
                file_path = Path(root) / file
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        for line_num, line in enumerate(f, 1):
                            if search_pattern.search(line):
                                results.append({
                                    "file": str(file_path.relative_to(self.project_path)),
                                    "line": line_num,
                                    "content": line.strip()
                                })
                except Exception:
                    continue
        
        return results
    
    def list_files(self, directory: str = ".") -> List[str]:
        path = self._validate_path(directory)
        
        if not path.exists():
            raise FileNotFoundError(f"Directory not found: {directory}")
        
        files = []
        for item in path.iterdir():
            if item.is_file():
                files.append(str(item.relative_to(self.project_path)))
        
        return files
    
    def delete_file(self, file_path: str) -> str:
        path = self._validate_path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        path.unlink()
        return f"File deleted: {file_path}"