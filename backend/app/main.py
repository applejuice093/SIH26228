"""CV-TRUST backend entry point: `uvicorn app.main:app` from backend/."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.core.config import API_PREFIX, APP_NAME, APP_VERSION, settings

app = FastAPI(title=APP_NAME, version=APP_VERSION, openapi_url=f"{API_PREFIX}/openapi.json", docs_url=f"{API_PREFIX}/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router, prefix=API_PREFIX)
