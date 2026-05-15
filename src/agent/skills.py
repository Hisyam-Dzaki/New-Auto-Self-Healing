from typing import Dict, List, Any, Optional
from enum import Enum

class SkillCategory(str, Enum):
    DEVELOPMENT = "development"
    DEBUGGING = "debugging"
    INFRASTRUCTURE = "infrastructure"
    AI = "ai"
    AUTONOMOUS = "autonomous"

class Skill:
    def __init__(
        self,
        name: str,
        description: str,
        category: SkillCategory,
        steps: List[str],
        tools: List[str],
        models: Dict[str, str]
    ):
        self.name = name
        self.description = description
        self.category = category
        self.steps = steps
        self.tools = tools
        self.models = models
    
    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "steps": self.steps,
            "tools": self.tools,
            "models": self.models
        }

class SkillRegistry:
    def __init__(self):
        self.skills: Dict[str, Skill] = {}
        self._register_default_skills()
    
    def _register_default_skills(self):
        self.skills["create_project"] = Skill(
            name="create_project",
            description="Bootstrap a new application project",
            category=SkillCategory.DEVELOPMENT,
            steps=[
                "analyze_requirements",
                "create_structure",
                "generate_files",
                "setup_dependencies",
                "setup_docker"
            ],
            tools=["project_tool", "file_tools", "shell_tool"],
            models={"planning": "anthropic/claude-3.5-sonnet", "coding": "deepseek/deepseek-coder"}
        )
        
        self.skills["generate_api"] = Skill(
            name="generate_api",
            description="Create REST/GraphQL API endpoints",
            category=SkillCategory.DEVELOPMENT,
            steps=[
                "design_endpoints",
                "create_routes",
                "add_validation",
                "create_tests"
            ],
            tools=["file_tools", "project_tool"],
            models={"planning": "openai/gpt-4", "coding": "anthropic/claude-3-sonnet"}
        )
        
        self.skills["fix_runtime_error"] = Skill(
            name="fix_runtime_error",
            description="Debug and fix runtime errors",
            category=SkillCategory.DEBUGGING,
            steps=[
                "analyze_logs",
                "inspect_stack_trace",
                "identify_root_cause",
                "generate_fix",
                "run_tests",
                "restart_service"
            ],
            tools=["logs_tool", "file_tools", "shell_tool", "docker_tool"],
            models={"analysis": "openai/gpt-4", "fix": "anthropic/claude-3.5-sonnet"}
        )
        
        self.skills["fix_build_error"] = Skill(
            name="fix_build_error",
            description="Debug and fix build/compilation errors",
            category=SkillCategory.DEBUGGING,
            steps=[
                "analyze_error_message",
                "check_dependencies",
                "fix_configuration",
                "rebuild"
            ],
            tools=["file_tools", "shell_tool"],
            models={"analysis": "openai/gpt-4", "fix": "deepseek/deepseek-coder"}
        )
        
        self.skills["create_docker_setup"] = Skill(
            name="create_docker_setup",
            description="Generate Docker configuration for a project",
            category=SkillCategory.INFRASTRUCTURE,
            steps=[
                "analyze_project",
                "select_base_image",
                "configure_dependencies",
                "setup_volumes",
                "configure_networking"
            ],
            tools=["file_tools", "docker_tool"],
            models={"planning": "anthropic/claude-3.5-sonnet", "config": "openai/gpt-4"}
        )
        
        self.skills["deploy_project"] = Skill(
            name="deploy_project",
            description="Deploy project to cloud/hosting",
            category=SkillCategory.INFRASTRUCTURE,
            steps=[
                "build_image",
                "push_registry",
                "configure_deployment",
                "deploy",
                "verify"
            ],
            tools=["docker_tool", "git_tool"],
            models={"deployment": "openai/gpt-4"}
        )
        
        self.skills["self_heal_project"] = Skill(
            name="self_heal_project",
            description="Autonomous repair for failing projects",
            category=SkillCategory.AUTONOMOUS,
            steps=[
                "detect_error",
                "read_logs",
                "analyze_cause",
                "generate_patch",
                "run_tests",
                "redeploy"
            ],
            tools=["logs_tool", "file_tools", "docker_tool", "shell_tool"],
            models={"analysis": "anthropic/claude-3.5-sonnet", "healing": "openai/gpt-4"}
        )
        
        self.skills["monitor_runtime"] = Skill(
            name="monitor_runtime",
            description="Monitor runtime health and metrics",
            category=SkillCategory.AUTONOMOUS,
            steps=[
                "collect_metrics",
                "analyze_performance",
                "detect_anomalies",
                "alert"
            ],
            tools=["logs_tool", "docker_tool"],
            models={"monitoring": "gemini/gemini-1.5-pro"}
        )
        
        self.skills["summarize_context"] = Skill(
            name="summarize_context",
            description="Compress and summarize conversation context",
            category=SkillCategory.AI,
            steps=[
                "extract_key_points",
                "compress_history",
                "store_summary"
            ],
            tools=["file_tools"],
            models={"summarization": "openai/gpt-3.5-turbo"}
        )
        
        self.skills["route_model"] = Skill(
            name="route_model",
            description="Select optimal model for current task",
            category=SkillCategory.AI,
            steps=[
                "analyze_task",
                "check_requirements",
                "select_model",
                "apply_routing"
            ],
            tools=[],
            models={"routing": "anthropic/claude-3.5-sonnet"}
        )
    
    def get_skill(self, name: str) -> Optional[Skill]:
        return self.skills.get(name)
    
    def list_skills(self, category: Optional[SkillCategory] = None) -> List[Dict]:
        if category:
            return [s.to_dict() for s in self.skills.values() if s.category == category]
        return [s.to_dict() for s in self.skills.values()]
    
    def register_skill(self, skill: Skill):
        self.skills[skill.name] = skill
    
    def get_skills_by_tool(self, tool_name: str) -> List[Skill]:
        return [s for s in self.skills.values() if tool_name in s.tools]