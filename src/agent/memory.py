from typing import List, Dict, Optional

class MemoryManager:
    def __init__(self, max_context_length: int = 10):
        self.max_context_length = max_context_length
        self.short_term_memory: List[Dict] = []
        self.long_term_memory: List[Dict] = []
    
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        message = {
            "role": role,
            "content": content,
            "metadata": metadata or {}
        }
        self.short_term_memory.append(message)
        
        if len(self.short_term_memory) > self.max_context_length:
            self._compress_memory()
    
    def get_context(self) -> List[Dict]:
        return self.short_term_memory
    
    def _compress_memory(self):
        if len(self.short_term_memory) > self.max_context_length:
            archived = self.short_term_memory[:2]
            self.long_term_memory.extend(archived)
            self.short_term_memory = self.short_term_memory[2:]
    
    def clear(self):
        self.short_term_memory = []
    
    def get_summary(self) -> str:
        return f"Messages: {len(self.short_term_memory)}, Archived: {len(self.long_term_memory)}"