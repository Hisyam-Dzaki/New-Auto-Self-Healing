from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import asyncio

router = APIRouter()

class PromptRequest(BaseModel):
    message: str
    projectId: Optional[str] = None
    model: Optional[str] = None
    workflow: Optional[str] = None

@router.post("/agent/prompt")
async def agent_prompt(request: PromptRequest):
    async def generate_response():
        try:
            from ..agent.core import AgentCore
            
            agent = AgentCore(
                model=request.model,
                workflow=request.workflow,
                project_id=request.projectId
            )
            
            async for chunk in agent.process_prompt(request.message):
                yield chunk.encode('utf-8')
                
        except Exception as e:
            yield f"Error: {str(e)}".encode('utf-8')
    
    return StreamingResponse(
        generate_response(),
        media_type="text/plain"
    )

@router.get("/chat/history/{project_id}")
async def get_chat_history(project_id: str):
    return {"messages": []}

@router.delete("/chat/history/{project_id}")
async def clear_chat_history(project_id: str):
    return {"status": "cleared"}
