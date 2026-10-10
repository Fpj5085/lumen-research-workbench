r"""End-to-end smoke test against a running demo_lab server.

Unlike the pytest suite, which drives the ASGI app in-process, this script
talks real HTTP to a real uvicorn process. It exists so the "it runs" claim can
be checked against an actual socket rather than a test transport.

Usage:

    .\.venv\Scripts\python.exe -m demo_lab --port 8001     # in one shell
    .\.venv\Scripts\python.exe scripts/live_smoke.py       # in another

Exits 0 when every check passes, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

import httpx

KEY_MAIN = "live-smoke-key-0001"
KEY_BLOCKED = "live-smoke-key-0002"
KEY_MISMATCH = "live-smoke-key-0003"
KEY_BAD_INPUT = "live-smoke-key-0004"

checks: list[tuple[str, bool, Any]] = []


def check(label: str, passed: bool, detail: Any) -> None:
    checks.append((label, bool(passed), detail))
    marker = "PASS" if passed else "FAIL"
    print(f"[{marker}] {label}: {json.dumps(detail, sort_keys=True, default=str)}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    args = parser.parse_args(argv)
    base = args.base_url.rstrip("/")

    with httpx.Client(base_url=base, timeout=30.0) as client:
        health = client.get("/health")
        body = health.json()
        check(
            "health reports synthetic in-memory mode",
            health.status_code == 200
            and body["demo_only"] is True
            and body["execution"]["persistence"] == "in-memory-only"
            and body["execution"]["queue"] == "none",
            {
                "status": health.status_code,
                "mode": body["execution"]["mode"],
                "persistence": body["execution"]["persistence"],
            },
        )

        first = client.post(
            "/demo/runs",
            json={"scenario": "success"},
            headers={"Idempotency-Key": KEY_MAIN},
        )
        first_body = first.json()
        check(
            "success run publishes and advances the pointer",
            first.status_code == 200
            and first_body["outcome"] == "published"
            and first_body["pointer_changed"] is True
            and first_body["published_version_after"] is not None,
            {
                "status": first.status_code,
                "outcome": first_body["outcome"],
                "data_version": first_body["data_version"],
                "published_version_after": first_body["published_version_after"],
            },
        )

        replay = client.post(
            "/demo/runs",
            json={"scenario": "success"},
            headers={"Idempotency-Key": KEY_MAIN},
        )
        check(
            "identical replay returns the identical receipt",
            replay.status_code == 200 and replay.json() == first_body,
            {"status": replay.status_code, "run_id": replay.json()["run_id"]},
        )

        conflict = client.post(
            "/demo/runs",
            json={"scenario": "success", "seed": 7},
            headers={"Idempotency-Key": KEY_MAIN},
        )
        check(
            "same key with a different payload is rejected with 409",
            conflict.status_code == 409
            and conflict.json()["detail"]["code"] == "idempotency_key_reused",
            {"status": conflict.status_code, "detail_code": conflict.json()["detail"]["code"]},
        )

        blocked = client.post(
            "/demo/runs",
            json={"scenario": "research_failed", "seed": 424242},
            headers={"Idempotency-Key": KEY_BLOCKED},
        )
        blocked_body = blocked.json()
        check(
            "incomplete research blocks and leaves the pointer alone",
            blocked.status_code == 200
            and blocked_body["outcome"] == "blocked"
            and blocked_body["code"] == "research_incomplete"
            and blocked_body["pointer_changed"] is False
            and blocked_body["published_version_after"]
            == first_body["published_version_after"],
            {
                "outcome": blocked_body["outcome"],
                "code": blocked_body["code"],
                "pointer_changed": blocked_body["pointer_changed"],
            },
        )

        mismatch = client.post(
            "/demo/runs",
            json={"scenario": "version_mismatch", "seed": 999},
            headers={"Idempotency-Key": KEY_MISMATCH},
        )
        mismatch_body = mismatch.json()
        check(
            "stale research input blocks and keeps the old pointer",
            mismatch.status_code == 200
            and mismatch_body["outcome"] == "blocked"
            and mismatch_body["code"] == "version_mismatch"
            and mismatch_body["pointer_changed"] is False
            and mismatch_body["published_version_after"]
            == first_body["published_version_after"],
            {
                "outcome": mismatch_body["outcome"],
                "code": mismatch_body["code"],
                "data_version": mismatch_body["data_version"],
                "published_version_after": mismatch_body["published_version_after"],
            },
        )

        invalid = client.post(
            "/demo/runs",
            json={"scenario": "data_invalid"},
            headers={"Idempotency-Key": KEY_BAD_INPUT},
        )
        invalid_body = invalid.json()
        stage_status = {s["name"]: s["status"] for s in invalid_body["stages"]}
        check(
            "invalid data blocks and skips downstream stages",
            invalid.status_code == 200
            and invalid_body["code"] == "data_invalid"
            and stage_status.get("research") == "skipped"
            and stage_status.get("publish") == "skipped",
            {"code": invalid_body["code"], "stage_status": stage_status},
        )

        published = client.get("/demo/published")
        published_body = published.json()
        pointer = published_body["published"]
        check(
            "published pointer still names the successful run",
            published.status_code == 200
            and pointer is not None
            and pointer["version"] == first_body["published_version_after"]
            and published_body["publish_count"] == 1,
            {
                "publish_count": published_body["publish_count"],
                "version": pointer["version"] if pointer else None,
                "snapshot_rows": pointer["snapshot"]["row_count"] if pointer else None,
                "symbol_total": pointer["snapshot"]["symbol_total"] if pointer else None,
            },
        )

        fetched = client.get(f"/demo/runs/{first_body['run_id']}")
        check(
            "GET /demo/runs/{id} matches the POST receipt",
            fetched.status_code == 200 and fetched.json() == first_body,
            {"status": fetched.status_code},
        )

        unknown = client.post(
            "/demo/runs",
            json={"scenario": "success", "unknown_field": 1},
            headers={"Idempotency-Key": "live-smoke-key-0009"},
        )
        check(
            "unknown field is rejected with 422",
            unknown.status_code == 422,
            {"status": unknown.status_code},
        )

        short_key = client.post(
            "/demo/runs",
            json={"scenario": "success"},
            headers={"Idempotency-Key": "abc"},
        )
        check(
            "short idempotency key is rejected with 422",
            short_key.status_code == 422,
            {"status": short_key.status_code},
        )

        missing_key = client.post("/demo/runs", json={"scenario": "success"})
        check(
            "missing idempotency key is rejected with 422",
            missing_key.status_code == 422,
            {"status": missing_key.status_code},
        )

    failed = [label for label, passed, _ in checks if not passed]
    print()
    print(f"checks: {len(checks)}  passed: {len(checks) - len(failed)}  failed: {len(failed)}")
    if failed:
        for label in failed:
            print(f"FAILED: {label}")
        return 1
    print("live smoke test: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

