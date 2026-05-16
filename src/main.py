from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api import chat, projects, containers, files, healing, company, github
import uvicorn

app = FastAPI(title="AgentForge API - AI Company Simulation", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(containers.router, prefix="/api", tags=["containers"])
app.include_router(files.router, prefix="/api", tags=["files"])
app.include_router(healing.router, prefix="/api", tags=["healing"])
app.include_router(company.router, prefix="/api", tags=["company"])
app.include_router(github.router, prefix="/api", tags=["github"])

@app.get("/")
async def root():
    return {"message": "AgentForge API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)