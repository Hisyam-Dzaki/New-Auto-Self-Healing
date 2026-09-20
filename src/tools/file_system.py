import os
import shutil
from typing import List, Optional

class FileSystemTools:
    PROJECT_ROOT = "/projects"

    def __init__(self, project_id: str = None):
        self.project_id = project_id or "default"
        self.root = os.path.join(self.PROJECT_ROOT, self.project_id)

    def read_file(self, path: str) -> str:
        safe_path = self._validate_path(path)
        with open(safe_path, 'r') as f:
            return f.read()

    def write_file(self, path: str, content: str) -> bool:
        safe_path = self._validate_path(path)
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        with open(safe_path, 'w') as f:
            f.write(content)
        return True

    def edit_file(self, path: str, old_text: str, new_text: str) -> bool:
        safe_path = self._validate_path(path)
        with open(safe_path, 'r') as f:
            content = f.read()
        content = content.replace(old_text, new_text)
        with open(safe_path, 'w') as f:
            f.write(content)
        return True

    def search_codebase(self, pattern: str, file_extension: str = None) -> List[str]:
        safe_path = self._validate_path(self.root)
        results = []
        extensions = (file_extension,) if file_extension else ('.py', '.js', '.ts', '.tsx', '.md')
        for root, dirs, files in os.walk(safe_path):
            for file in files:
                if file.endswith(extensions):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r') as f:
                        if pattern in f.read():
                            results.append(file_path)
        return results

    def list_files(self, directory: str = ".") -> List[str]:
        safe_path = self._validate_path(os.path.join(self.root, directory))
        if not os.path.isdir(safe_path):
            raise FileNotFoundError(f"Directory not found: {directory}")
        return os.listdir(safe_path)

    def delete_file(self, path: str) -> bool:
        safe_path = self._validate_path(os.path.join(self.root, path))
        if not os.path.exists(safe_path):
            raise FileNotFoundError(f"File not found: {path}")
        if os.path.isdir(safe_path):
            shutil.rmtree(safe_path)
        else:
            os.remove(safe_path)
        return True

    def _validate_path(self, path: str) -> str:
        safe_path = os.path.abspath(path)
        if not safe_path.startswith(os.path.abspath(self.PROJECT_ROOT)):
            raise PermissionError("Access denied: path outside project root")
        return safe_path