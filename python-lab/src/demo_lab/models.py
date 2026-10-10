"""Strict request/response contracts for the demo API.

Every model forbids unknown fields and uses strict validation, so a mistyped
field name or a stringified number is rejected with HTTP 422 instead of being
coerced. The numeric bounds below are Demo compute guards (they cap how much
synthetic data one request may materialize). They are not business rules and
no market threshold is encoded anywhere in this package.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .synthetic import (
    DEFAULT_SEED,
    MAX_BARS_PER_SYMBOL,
    MAX_SYMBOL_COUNT,
)

Scenario = Literal["success", "research_failed", "version_mismatch", "data_invalid"]
Outcome = Literal["published", "no_change", "blocked"]
StageStatus = Literal["ok", "failed", "skipped", "blocked"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class RunRequest(_Strict):
    """Input for POST /demo/runs."""

    scenario: Scenario = "success"
    seed: int = Field(default=DEFAULT_SEED, ge=0, le=2**32 - 1)
    symbol_count: int = Field(default=MAX_SYMBOL_COUNT, ge=1, le=MAX_SYMBOL_COUNT)
    bars_per_symbol: int = Field(default=MAX_BARS_PER_SYMBOL, ge=1, le=MAX_BARS_PER_SYMBOL)
    research_input_version: str | None = Field(
        default=None,
        max_length=64,
        description=(
            "Data version the research output claims it consumed. When omitted, "
            "the demo picks a value appropriate to the scenario."
        ),
    )
    expected_data_version: str | None = Field(
        default=None,
        max_length=64,
        description=(
            "Optional caller-supplied data version. When present and different "
            "from the recomputed version, the run is blocked with "
            "data_version_mismatch."
        ),
    )


class ExecutionInfo(_Strict):
    """Explicit statement of what this experiment is and is not."""

    mode: Literal["synchronous-in-process"] = "synchronous-in-process"
    queue: Literal["none"] = "none"
    persistence: Literal["in-memory-only"] = "in-memory-only"
    concurrency: Literal["single-process-lock"] = "single-process-lock"
    note: str = (
        "Stages run inline in the request handler. There is no broker, no "
        "worker pool and no durable store; state is lost on restart."
    )


class StageResult(_Strict):
    name: str
    status: StageStatus
    detail: str
    counters: dict[str, int] = Field(default_factory=dict)


class RunReceipt(_Strict):
    """Deterministic receipt returned for a run.

    Replaying the same Idempotency-Key with the same payload returns this exact
    document unchanged.
    """

    receipt_id: str
    run_id: str
    idempotency_key: str
    request_digest: str
    scenario: Scenario
    outcome: Outcome
    code: str | None
    message: str
    data_version: str
    data_digest: str
    research_version: str | None
    research_input_version: str | None
    published_version_before: str | None
    published_version_after: str | None
    pointer_changed: bool
    stages: list[StageResult]
    execution: ExecutionInfo
    created_at: str


class PublishedSnapshot(_Strict):
    """A frozen, read-only aggregate over the published dataset."""

    schema_version: Literal["demo-snapshot/1"] = "demo-snapshot/1"
    rows: list[dict[str, object]]
    row_count: int
    symbol_total: int


class PublishedPointer(_Strict):
    version: str
    data_version: str
    data_digest: str
    research_version: str
    run_id: str
    published_at: str
    snapshot_digest: str
    snapshot: PublishedSnapshot


class PublishedResponse(_Strict):
    """Current published pointer.

    A null pointer means nothing has been published yet; it never falls back to
    an older snapshot presented as the latest one.
    """

    published: PublishedPointer | None
    run_count: int
    publish_count: int
    last_run_id: str | None
    last_outcome: Outcome | None
    execution: ExecutionInfo


class HealthResponse(_Strict):
    status: Literal["ok"] = "ok"
    service: str
    demo_only: Literal[True] = True
    synthetic_data: Literal[True] = True
    run_count: int
    publish_count: int
    idempotency_keys: int
    execution: ExecutionInfo


class RunListResponse(_Strict):
    runs: list[RunReceipt]
    count: int

