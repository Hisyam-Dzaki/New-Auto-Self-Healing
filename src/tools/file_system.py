import os
from typing import List, Optional

class FileSystemTools:
    PROJECT_ROOT = "/projects"
    
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

    def search_codebase(self, path: str, pattern: str) -> List[str]:
        safe_path = self._validate_path(path)
        results = []
        for root, dirs, files in os.walk(safe_path):
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.tsx', '.md')):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r') as f:
                        if pattern in f.read():
                            results.append(file_path)
        return results

    def _validate_path(self, path: str) -> str:
        safe_path = os.path.abspath(path)
        if not safe_path.startswith(os.path.abspath(self.PROJECT_ROOT)):
            raise PermissionError("Access denied: path outside project root")
        return safe_path