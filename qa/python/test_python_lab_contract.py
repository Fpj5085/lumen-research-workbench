r"""Independent, black-box contract tests for the python-lab experiment.

Reviewer-owned: this file lives under qa/ and does not import the implementation's
private helpers beyond the public ASGI app factory. It asserts the *observable*
contract (status codes, pointer invariants, idempotency) rather than re-running the
implementer's own suite, so a green result here is independent evidence.

Run with the python-lab virtualenv:
    cd python-lab
    .\.venv\Scripts\python.exe -m pytest -q ..\qa\python\test_python_lab_contract.py
"""

from __future__ import annotations

import concurrent.futures
import uuid

import pytest
from fastapi.testclient import TestClient

from demo_lab.app import create_app
from demo_lab.store import DemoStore


@pytest.fixture()
def client():
    app = create_app(store=DemoStore())
    with TestClient(app) as c:
        yield c


def _key() -> str:
    return f"qa-{uuid.uuid4().hex}"


def _run(client, key, **payload):
    body = {"scenario": "success"}
    body.update(payload)
    return client.post("/demo/runs", json=body, headers={"Idempotency-Key": key})


def test_health_declares_non_production_mode(client):
    r = client.get("/health")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "ok"
    assert body["demo_only"] is True
    assert body["synthetic_data"] is True
    assert body["execution"]["queue"] == "none"
    assert body["execution"]["persistence"] == "in-memory-only"


def test_published_pointer_starts_empty_and_never_fakes_latest(client):
    r = client.get("/demo/published")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["published"] is None
    assert body["publish_count"] == 0


@pytest.mark.parametrize(
    "scenario,expected_code",
    [
        ("research_failed", "research_incomplete"),
        ("version_mismatch", "version_mismatch"),
        ("data_invalid", "data_invalid"),
    ],
)
def test_blocked_scenarios_keep_pointer_byte_identical(client, scenario, expected_code):
    first = _run(client, _key())
    assert first.status_code == 200, first.text
    assert first.json()["outcome"] == "published"
    pointer_after_publish = client.get("/demo/published").json()["published"]
    assert pointer_after_publish is not None

    blocked = _run(client, _key(), scenario=scenario)
    assert blocked.status_code == 200, blocked.text
    body = blocked.json()
    assert body["outcome"] == "blocked", body
    assert body["code"] == expected_code, body
    assert body["pointer_changed"] is False
    assert body["published_version_after"] == body["published_version_before"]

    pointer_after_block = client.get("/demo/published").json()["published"]
    assert pointer_after_block == pointer_after_publish, (
        "a blocked run must not relabel or move the published pointer"
    )


def test_blocked_runs_are_still_stored_and_queryable(client):
    key = _key()
    r = _run(client, key, scenario="research_failed")
    assert r.status_code == 200, r.text
    run_id = r.json()["run_id"]
    fetched = client.get(f"/demo/runs/{run_id}")
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["outcome"] == "blocked"


def test_same_key_same_payload_returns_identical_receipt(client):
    key = _key()
    first = _run(client, key, seed=1234)
    second = _run(client, key, seed=1234)
    assert first.status_code == 200 and second.status_code == 200
    assert first.json() == second.json()
    assert client.get("/health").json()["run_count"] == 1


def test_same_key_different_payload_is_409(client):
    key = _key()
    assert _run(client, key, seed=1234).status_code == 200
    conflict = _run(client, key, seed=4321)
    assert conflict.status_code == 409, conflict.text
    detail = conflict.json()["detail"]
    assert detail["code"] == "idempotency_key_reused"
    assert detail["idempotency_key"] == key


def test_missing_idempotency_key_is_rejected(client):
    r = client.post("/demo/runs", json={"scenario": "success"})
    assert r.status_code in (400, 422), r.text


def test_short_idempotency_key_is_rejected(client):
    r = client.post("/demo/runs", json={"scenario": "success"}, headers={"Idempotency-Key": "abc"})
    assert r.status_code == 422, r.text


def test_unknown_fields_are_rejected(client):
    r = client.post(
        "/demo/runs",
        json={"scenario": "success", "not_a_field": 1},
        headers={"Idempotency-Key": _key()},
    )
    assert r.status_code == 422, r.text


def test_data_version_is_content_derived_not_assignable(client):
    a = _run(client, _key(), seed=1111).json()["data_version"]
    b = _run(client, _key(), seed=1111).json()["data_version"]
    c = _run(client, _key(), seed=2222).json()["data_version"]
    assert a == b, "the same seed must always produce the same data version"
    assert a != c, "a different seed must produce a different data version"


def test_caller_supplied_expected_version_mismatch_blocks(client):
    r = _run(client, _key(), seed=777, expected_data_version="0" * 64)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outcome"] == "blocked", body
    assert body["code"] == "data_version_mismatch", body
    assert body["pointer_changed"] is False


def test_already_published_version_is_a_no_change_not_a_republish(client):
    key_a = _key()
    first = _run(client, key_a, seed=555).json()
    assert first["outcome"] == "published"
    second = _run(client, _key(), seed=555).json()
    assert second["outcome"] == "no_change", second
    assert second["pointer_changed"] is False
    assert second["code"] == "already_published", second


def test_stages_run_in_declared_order_and_blocked_skips_downstream(client):
    ok = _run(client, _key()).json()
    names = [s["name"] for s in ok["stages"]]
    assert names[:3] == ["data_generate", "data_validate", "version_check"], names
    assert names[-1] == "publish", names
    assert ok["stages"][-1]["status"] == "ok"

    blocked = _run(client, _key(), scenario="research_failed").json()
    by_name = {s["name"]: s for s in blocked["stages"]}
    assert by_name["gate"]["status"] == "blocked", by_name["gate"]
    assert by_name["publish"]["status"] == "skipped", by_name["publish"]


def test_published_snapshot_is_frozen_and_self_consistent(client):
    _run(client, _key())
    pointer = client.get("/demo/published").json()["published"]
    snap = pointer["snapshot"]
    assert snap["schema_version"] == "demo-snapshot/1"
    assert snap["row_count"] == len(snap["rows"])
    assert snap["row_count"] > 0
    assert snap["symbol_total"] >= snap["row_count"]


def test_unknown_run_id_is_404(client):
    r = client.get("/demo/runs/does-not-exist")
    assert r.status_code == 404, r.text
    assert r.json()["detail"]["code"] == "run_not_found"


def test_concurrent_identical_runs_publish_at_most_once(client):
    payload = {"scenario": "success", "seed": 909090}

    def fire(_i: int):
        return client.post(
            "/demo/runs", json=payload, headers={"Idempotency-Key": _key()}
        ).json()

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fire, range(8)))

    published = [r for r in results if r["outcome"] == "published"]
    assert len(published) == 1, [r["outcome"] for r in results]
    assert client.get("/demo/published").json()["publish_count"] == 1


def test_no_cors_middleware_is_installed(client):
    r = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in {k.lower() for k in r.headers}, dict(r.headers)


def test_root_endpoint_labels_the_service_as_demo_only(client):
    r = client.get("/")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["demo_only"] == "true"
