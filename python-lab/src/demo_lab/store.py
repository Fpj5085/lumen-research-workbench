"""In-memory run store, gate and publish pointer.

Thread-safety contract
----------------------
Every read and every mutation happens while holding a single re-entrant lock,
and a whole run executes inside that lock. Two consequences follow, and both
are deliberate:

* idempotency is atomic: the fingerprint check and the receipt write cannot be
  interleaved by another request, so a key can never map to two payloads;
* publishing is single-flight: concurrent identical requests serialize, and the
  publish pointer advances at most once per distinct data version.

The cost is that concurrent runs do not overlap. That is acceptable for a
synchronous, in-process experiment and is exactly why this is not presented as
queue-backed production behaviour.

Nothing here is persisted. Restarting the process discards runs, idempotency
keys and the published pointer.
"""

from __future__ import annotations

import copy
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .canonical import (
    DATA_VERSION_PREFIX,
    digest_of,
    version_label,
)
from .models import RunRequest
from .synthetic import SCHEMA as DATASET_SCHEMA
from .synthetic import bar_total, build_dataset, validate_dataset

SNAPSHOT_SCHEMA = "demo-snapshot/1"
SNAPSHOT_LIMIT = 20
STALE_DATA_VERSION = version_label(DATA_VERSION_PREFIX, "0" * 64)

SERVICE_NAME = "lumen-python-lab"

BLOCKED_CODES = {
    "data_invalid": "data_invalid",
    "research_incomplete": "research_incomplete",
    "version_mismatch": "version_mismatch",
    "data_version_mismatch": "data_version_mismatch",
    "already_published": "already_published",
}


class IdempotencyConflict(Exception):
    """Raised when a key is reused with a different payload."""

    def __init__(self, key: str, run_id: str) -> None:
        super().__init__(f"idempotency key {key!r} was already used by run {run_id}")
        self.key = key
        self.run_id = run_id


@dataclass(frozen=True)
class _IdempotencyEntry:
    request_digest: str
    run_id: str
    body: dict[str, Any]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _stage(name: str, status: str, detail: str, **counters: int) -> dict[str, Any]:
    return {"name": name, "status": status, "detail": detail, "counters": dict(counters)}


def _execution_info() -> dict[str, Any]:
    return {
        "mode": "synchronous-in-process",
        "queue": "none",
        "persistence": "in-memory-only",
        "concurrency": "single-process-lock",
        "note": (
            "Stages run inline in the request handler. There is no broker, no "
            "worker pool and no durable store; state is lost on restart."
        ),
    }


def _build_snapshot(dataset: dict[str, Any], limit: int = SNAPSHOT_LIMIT) -> dict[str, Any]:
    """Aggregate the dataset into a small, deterministic leaderboard.

    All arithmetic is integer arithmetic over the minor units in the dataset,
    so the snapshot digest is reproducible.
    """

    rows: list[dict[str, object]] = []
    for record in dataset["records"]:
        bars = record["bars"]
        first_close = bars[0]["c"]
        last_close = bars[-1]["c"]
        change_bp = (last_close - first_close) * 10_000 // first_close
        rows.append(
            {
                "symbol": record["symbol"],
                "close": last_close,
                "first_close": first_close,
                "change_bp": change_bp,
                "volume_total": sum(bar["v"] for bar in bars),
                "bar_count": len(bars),
            }
        )
    rows.sort(key=lambda row: (-int(row["change_bp"]), str(row["symbol"])))
    trimmed = rows[:limit]
    return {
        "schema_version": SNAPSHOT_SCHEMA,
        "rows": trimmed,
        "row_count": len(trimmed),
        "symbol_total": len(rows),
    }


class DemoStore:
    """Runs, idempotency receipts and the published pointer."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._idempotency: dict[str, _IdempotencyEntry] = {}
        self._runs: dict[str, dict[str, Any]] = {}
        self._run_order: list[str] = []
        self._published: dict[str, Any] | None = None
        self._publish_count = 0

    # ---------------------------------------------------------------- reads

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "status": "ok",
                "service": SERVICE_NAME,
                "demo_only": True,
                "synthetic_data": True,
                "run_count": len(self._runs),
                "publish_count": self._publish_count,
                "idempotency_keys": len(self._idempotency),
                "execution": _execution_info(),
            }

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with self._lock:
            body = self._runs.get(run_id)
            return copy.deepcopy(body) if body is not None else None

    def list_runs(self, limit: int) -> dict[str, Any]:
        with self._lock:
            ids = self._run_order[-limit:]
            runs = [copy.deepcopy(self._runs[run_id]) for run_id in reversed(ids)]
            return {"runs": runs, "count": len(runs)}

    def published(self) -> dict[str, Any]:
        with self._lock:
            pointer = copy.deepcopy(self._published)
            last = self._runs[self._run_order[-1]] if self._run_order else None
            return {
                "published": pointer,
                "run_count": len(self._runs),
                "publish_count": self._publish_count,
                "last_run_id": last["run_id"] if last else None,
                "last_outcome": last["outcome"] if last else None,
                "execution": _execution_info(),
            }

    # --------------------------------------------------------------- writes

    def execute(self, request: RunRequest, idempotency_key: str) -> tuple[int, dict[str, Any]]:
        """Run the pipeline under the store lock.

        Returns (http_status, body). A replay returns 200 with the stored
        receipt; a reused key with a different payload raises
        IdempotencyConflict.
        """

        fingerprint = digest_of(request.model_dump(mode="json"))
        with self._lock:
            existing = self._idempotency.get(idempotency_key)
            if existing is not None:
                if existing.request_digest != fingerprint:
                    raise IdempotencyConflict(idempotency_key, existing.run_id)
                return 200, copy.deepcopy(existing.body)

            body = self._execute_locked(request, idempotency_key, fingerprint)
            self._idempotency[idempotency_key] = _IdempotencyEntry(
                request_digest=fingerprint,
                run_id=body["run_id"],
                body=body,
            )
            return 200, copy.deepcopy(body)

    # ------------------------------------------------------------- pipeline

    def _execute_locked(
        self, request: RunRequest, idempotency_key: str, fingerprint: str
    ) -> dict[str, Any]:
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        stages: list[dict[str, Any]] = []

        # Stage 1: generate synthetic data.
        dataset = build_dataset(
            seed=request.seed,
            symbol_count=request.symbol_count,
            bars_per_symbol=request.bars_per_symbol,
            inject_defect=request.scenario == "data_invalid",
        )
        data_digest = digest_of(dataset)
        data_version = version_label(DATA_VERSION_PREFIX, data_digest)
        stages.append(
            _stage(
                "data_generate",
                "ok",
                f"generated {DATASET_SCHEMA} from seed {request.seed}",
                symbols=request.symbol_count,
                bars=bar_total(dataset),
            )
        )

        def finish(
            *,
            outcome: str,
            code: str | None,
            message: str,
            research_version: str | None,
            research_input_version: str | None,
            pointer_changed: bool,
            published_before: str | None,
            published_after: str | None,
        ) -> dict[str, Any]:
            receipt = {
                "receipt_id": f"rcpt_{digest_of([run_id, data_version, outcome])[:12]}",
                "run_id": run_id,
                "idempotency_key": idempotency_key,
                "request_digest": fingerprint,
                "scenario": request.scenario,
                "outcome": outcome,
                "code": code,
                "message": message,
                "data_version": data_version,
                "data_digest": data_digest,
                "research_version": research_version,
                "research_input_version": research_input_version,
                "published_version_before": published_before,
                "published_version_after": published_after,
                "pointer_changed": pointer_changed,
                "stages": stages,
                "execution": _execution_info(),
                "created_at": _now(),
            }
            self._runs[run_id] = receipt
            self._run_order.append(run_id)
            return receipt

        def block(code: str, message: str) -> dict[str, Any]:
            stages.append(_stage("gate", "blocked", message))
            stages.append(_stage("publish", "skipped", "publish pointer left unchanged"))
            return finish(
                outcome="blocked",
                code=code,
                message=message,
                research_version=None,
                research_input_version=request.research_input_version,
                pointer_changed=False,
                published_before=self._published["version"] if self._published else None,
                published_after=self._published["version"] if self._published else None,
            )

        published_before = self._published["version"] if self._published else None

        # Stage 2: validate the generated data.
        problems = validate_dataset(dataset)
        if problems:
            stages.append(
                _stage(
                    "data_validate",
                    "failed",
                    "invariant violations detected: " + "; ".join(problems[:3]),
                    checked_bars=bar_total(dataset),
                    problems=len(problems),
                )
            )
            stages.append(_stage("research", "skipped", "data validation failed"))
            return block(
                BLOCKED_CODES["data_invalid"],
                f"data validation failed with {len(problems)} problem(s); "
                "downstream stages skipped and no snapshot was published",
            )
        stages.append(
            _stage(
                "data_validate",
                "ok",
                "OHLCV invariants hold; digest recomputed from content",
                checked_bars=bar_total(dataset),
                problems=0,
            )
        )

        # Stage 3: caller-supplied version verification.
        if request.expected_data_version is not None and request.expected_data_version != data_version:
            stages.append(
                _stage(
                    "version_check",
                    "failed",
                    "expected " + request.expected_data_version + " but recomputed " + data_version,
                )
            )
            stages.append(_stage("research", "skipped", "data version mismatch"))
            return block(
                BLOCKED_CODES["data_version_mismatch"],
                "caller expected data version " + request.expected_data_version
                + " but the regenerated dataset hashes to " + data_version,
            )
        stages.append(
            _stage(
                "version_check",
                "ok",
                "data version " + data_version + " confirmed",
            )
        )

        # Stage 4: research stage.
        if request.scenario == "research_failed":
            stages.append(
                _stage(
                    "research",
                    "failed",
                    "research stage reported incomplete and produced no output",
                    evaluated=0,
                )
            )
            return block(
                BLOCKED_CODES["research_incomplete"],
                "research stage is incomplete, so no candidate snapshot was "
                "submitted for the current data version",
            )

        research_input_version = request.research_input_version
        if research_input_version is None:
            research_input_version = (
                STALE_DATA_VERSION
                if request.scenario == "version_mismatch"
                else data_version
            )

        research_payload = {
            "schema": "demo-research/1",
            "input_version": research_input_version,
            "input_digest": data_digest,
            "evaluated": len(dataset["records"]),
        }
        research_version = version_label("rv", digest_of(research_payload))
        stages.append(
            _stage(
                "research",
                "ok",
                "research completed against input version " + research_input_version,
                evaluated=len(dataset["records"]),
            )
        )

        # Stage 5: consistency gate.
        if research_input_version != data_version:
            stages.append(
                _stage(
                    "gate",
                    "blocked",
                    "research input " + research_input_version
                    + " does not match current data version " + data_version,
                )
            )
            stages.append(
                _stage("publish", "skipped", "publish pointer left unchanged")
            )
            return finish(
                outcome="blocked",
                code=BLOCKED_CODES["version_mismatch"],
                message=(
                    "research input version does not match the current data "
                    "version; the previously published pointer is retained and "
                    "is not relabelled with the new data date"
                ),
                research_version=research_version,
                research_input_version=research_input_version,
                pointer_changed=False,
                published_before=published_before,
                published_after=published_before,
            )
        stages.append(
            _stage("gate", "ok", "research input version matches the data version")
        )

        # Stage 6: candidate snapshot.
        snapshot = _build_snapshot(dataset)
        snapshot_digest = digest_of(snapshot)
        stages.append(
            _stage(
                "candidate",
                "ok",
                "candidate snapshot frozen as " + snapshot_digest[:16],
                rows=snapshot["row_count"],
            )
        )

        # Stage 7: publish.
        if self._published is not None and self._published["data_version"] == data_version:
            stages.append(
                _stage(
                    "publish",
                    "skipped",
                    "data version " + data_version + " is already published",
                )
            )
            return finish(
                outcome="no_change",
                code=BLOCKED_CODES["already_published"],
                message=(
                    "the candidate carries data version " + data_version
                    + ", which is already published; the pointer was left unchanged"
                ),
                research_version=research_version,
                research_input_version=research_input_version,
                pointer_changed=False,
                published_before=published_before,
                published_after=published_before,
            )

        version = version_label("pub", snapshot_digest)
        pointer = {
            "version": version,
            "data_version": data_version,
            "data_digest": data_digest,
            "research_version": research_version,
            "run_id": run_id,
            "published_at": _now(),
            "snapshot_digest": snapshot_digest,
            "snapshot": snapshot,
        }
        self._published = pointer
        self._publish_count += 1
        stages.append(
            _stage(
                "publish",
                "ok",
                "published pointer advanced to " + version,
                rows=snapshot["row_count"],
            )
        )
        return finish(
            outcome="published",
            code=None,
            message=(
                "research output matches data version " + data_version
                + "; published pointer advanced"
            ),
            research_version=research_version,
            research_input_version=research_input_version,
            pointer_changed=True,
            published_before=published_before,
            published_after=version,
        )

