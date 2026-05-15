from typing import Dict, Any, List

class Validator:
    def __init__(self):
        self.validation_rules = {}
    
    def validate_output(self, output: str, expected_type: str) -> bool:
        if expected_type == "code":
            return self._validate_code(output)
        elif expected_type == "json":
            return self._validate_json(output)
        elif expected_type == "command":
            return self._validate_command(output)
        return True
    
    def _validate_code(self, code: str) -> bool:
        if not code or len(code.strip()) == 0:
            return False
        return True
    
    def _validate_json(self, json_str: str) -> bool:
        try:
            import json
            json.loads(json_str)
            return True
        except:
            return False
    
    def _validate_command(self, command: str) -> bool:
        blocked = ["rm -rf /", "shutdown", "reboot", "mkfs"]
        for pattern in blocked:
            if pattern in command.lower():
                return False
        return True
    
    def validate_tool_output(self, tool_name: str, output: Any) -> Dict:
        return {
            "valid": True,
            "tool": tool_name,
            "output": output
        }