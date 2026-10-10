"""FastAPI surface for the synthetic demo.

Endpoints
---------
* POST /demo/runs        run the pipeline; requires an Idempotency-Key header
* GET  /demo/runs/{id}   fetch one stored receipt
* GET  /demo/published   fetch the current published pointer
* GET  /health           liveness plus the execution-mode disclosure

Scope notes that are part of the contract, not disclaimers bolted on:

* all data is synthetic and generated in-process from a fixed seed;
* there is no network egress, no secret, no filesystem path taken from input;
* state lives in memory only and resets when the process restarts;
* this service is fully decoupled from the static demo site, which never calls
  it. No CORS middleware is installed, because nothing is meant to call it from
  a browser origin.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from . import __version__
from .models import (
    HealthResponse,
    PublishedResponse,
    RunListResponse,
    RunReceipt,
    RunRequest,
)
from .store import SERVICE_NAME, DemoStore, IdempotencyConflict

IDEMPOTENCY_KEY_MIN = 8
IDEMPOTENCY_KEY_MAX = 128


def create_app(store: DemoStore | None = None) -> FastAPI:
    """Build the ASGI app. Tests may inject their own store instance."""

    app = FastAPI(
        title="LUMEN Python Lab (synthetic demo)",
        version=__version__,
        description=(
            "Independent synthetic-data experiment. Local, in-memory and "
            "synchronous; not a production service. All identifiers, prices "
            "and volumes are generated from a fixed seed."
        ),
    )
    app.state.store = store if store is not None else DemoStore()

    def get_store(request: Request) -> DemoStore:
        return request.app.state.store

    @app.exception_handler(IdempotencyConflict)
    async def _conflict_handler(_: Request, exc: IdempotencyConflict) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "detail": {
                    "code": "idempotency_key_reused",
                    "message": (
                        "this Idempotency-Key is already bound to a different "
                        "request payload; reuse the original payload or use a "
                        "new key"
                    ),
                    "idempotency_key": exc.key,
                    "bound_run_id": exc.run_id,
                }
            },
        )

    @app.get("/health", response_model=HealthResponse)
    def health(store: DemoStore = Depends(get_store)) -> HealthResponse:
        return HealthResponse(**store.health())

    @app.post("/demo/runs", response_model=RunReceipt)
    def create_run(
        payload: RunRequest,
        store: DemoStore = Depends(get_store),
        idempotency_key: str = Header(alias="Idempotency-Key"),
    ) -> RunReceipt:
        key = idempotency_key.strip()
        if not (IDEMPOTENCY_KEY_MIN <= len(key) <= IDEMPOTENCY_KEY_MAX):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "invalid_idempotency_key",
                    "message": (
                        "Idempotency-Key must be "
                        f"{IDEMPOTENCY_KEY_MIN}-{IDEMPOTENCY_KEY_MAX} characters "
                        "after trimming"
                    ),
                },
            )
        _, body = store.execute(payload, key)
        return RunReceipt(**body)

    @app.get("/demo/runs/{run_id}", response_model=RunReceipt)
    def get_run(run_id: str, store: DemoStore = Depends(get_store)) -> RunReceipt:
        body = store.get_run(run_id)
        if body is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "run_not_found",
                    "message": (
                        "no run with that id in this process; in-memory state "
                        "resets when the service restarts"
                    ),
                },
            )
        return RunReceipt(**body)

    @app.get("/demo/runs", response_model=RunListResponse)
    def list_runs(
        store: DemoStore = Depends(get_store),
        limit: int = Query(default=20, ge=1, le=50),
    ) -> RunListResponse:
        return RunListResponse(**store.list_runs(limit))

    @app.get("/demo/published", response_model=PublishedResponse)
    def get_published(store: DemoStore = Depends(get_store)) -> PublishedResponse:
        return PublishedResponse(**store.published())

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {
            "service": SERVICE_NAME,
            "demo_only": "true",
            "docs": "/docs",
            "endpoints": "/health, POST /demo/runs, GET /demo/runs/{id}, "
            "GET /demo/published",
        }

    return app


app = create_app()

__all__ = ["app", "create_app", "ValidationError"]

