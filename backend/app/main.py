"""CV-TRUST backend entry point: `uvicorn app.main:app` from backend/."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.v1 import router as v1_router
from app.core.config import API_PREFIX, APP_NAME, APP_VERSION, Settings, get_settings
from app.repositories.store import Store
from app.services.audit import Audit
from app.services.data_integrity import ApiError, DataIntegrityService


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        app.state.store.close()

    app = FastAPI(title=APP_NAME, version=APP_VERSION, openapi_url=f"{API_PREFIX}/openapi.json",
                  docs_url=f"{API_PREFIX}/docs", lifespan=lifespan)
    store = Store(settings.db_path)
    app.state.store = store
    app.state.service = DataIntegrityService(store, Audit(store, settings.audit_key_path), settings)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])

    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError):
        return JSONResponse(status_code=exc.status, content={"error": exc.body})

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "request failed validation",
                                                                "recoverable": True, "details": exc.errors()}})

    app.include_router(health_router, prefix=API_PREFIX)
    app.include_router(v1_router, prefix=API_PREFIX)
    return app


app = create_app()
