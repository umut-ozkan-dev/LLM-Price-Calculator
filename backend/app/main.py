"""FastAPI application."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.estimate import router as estimate_router
from app.api.models import router as models_router
from app.api.run import execute_run
from app.config import Settings, get_settings
from app.schemas import RunRequest, RunResponse


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    limiter = Limiter(key_func=get_remote_address, default_limits=[])
    app = FastAPI(
        title="LLM Prompt Price Calculator",
        version="0.1.0",
        summary="Estimate and measure the USD cost of a prompt across LLM APIs.",
    )
    app.state.limiter = limiter
    app.state.settings = resolved
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list or ["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(models_router, prefix="/api")
    app.include_router(estimate_router, prefix="/api")

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/run", response_model=RunResponse)
    @limiter.limit(resolved.rate_limit_run)
    def run_prompt(request: Request, body: RunRequest) -> RunResponse:
        del request
        return execute_run(body, resolved)

    return app


app = create_app()
