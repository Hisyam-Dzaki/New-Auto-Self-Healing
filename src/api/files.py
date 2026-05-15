from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class FileReadRequest(BaseModel):
    project_id: str
    file_path: str

class FileWriteRequest(BaseModel):
    project_id: str
    file_path: str
    content: str

class FileEditRequest(BaseModel):
    project_id: str
    file_path: str
    old_content: str
    new_content: str

class SearchRequest(BaseModel):
    project_id: str
    pattern: str
    file_extension: Optional[str] = None

@router.post("/read")
async def read_file(request: FileReadRequest):
    from ..tools.file_tools import FileSystemTools
    
    try:
        fs = FileSystemTools(request.project_id)
        content = fs.read_file(request.file_path)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/write")
async def write_file(request: FileWriteRequest):
    from ..tools.file_tools import FileSystemTools
    
    try:
        fs = FileSystemTools(request.project_id)
        result = fs.write_file(request.file_path, request.content)
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/edit")
async def edit_file(request: FileEditRequest):
    from ..tools.file_tools import FileSystemTools
    
    try:
        fs = FileSystemTools(request.project_id)
        result = fs.edit_file(request.file_path, request.old_content, request.new_content)
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/search")
async def search_codebase(request: SearchRequest):
    from ..tools.file_tools import FileSystemTools
    
    try:
        fs = FileSystemTools(request.project_id)
        results = fs.search_codebase(request.pattern, request.file_extension)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/list/{project_id}")
async def list_files(project_id: str, directory: str = "."):
    from ..tools.file_tools import FileSystemTools
    
    try:
        fs = FileSystemTools(project_id)
        files = fs.list_files(directory)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/delete")
async def delete_file(request: FileReadRequest):
    from ..tools.file_tools import FileSystemTools
    
    try:
        fs = FileSystemTools(request.project_id)
        result = fs.delete_file(request.file_path)
        return {"message": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))