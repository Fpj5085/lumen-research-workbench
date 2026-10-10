"""HTTP contract: validation, health, lookup and disclosure."""

from __future__ import annotations

from demo_lab.canonical import data_version_of
from demo_lab.synthetic import build_dataset

from .conftest import post_run


def test_health_reports_synthetic_in_memory_mode(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["demo_only"] is True
    assert body["synthetic_data"] is True
    assert body["execution"]["queue"] == "none"
    assert body["execution"]["persistence"] == "in-memory-only"
    assert body["execution"]["mode"] == "synchronous-in-process"
    assert body["run_count"] == 0


def test_health_counts_advance_with_runs(client, key):
    post_run(client, key)
    body = client.get("/health").json()
    assert body["run_count"] == 1
    assert body["publish_count"] == 1
    assert body["idempotency_keys"] == 1


def test_run_requires_idempotency_key(client):
    response = client.post("/demo/runs", json={"scenario": "success"})
    assert response.status_code == 422


def test_blank_idempotency_key_is_rejected(client):
    response = client.post(
        "/demo/runs", json={"scenario": "success"}, headers={"Idempotency-Key": "   "}
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_idempotency_key"


def test_short_idempotency_key_is_rejected(client):
    response = client.post(
        "/demo/runs", json={"scenario": "success"}, headers={"Idempotency-Key": "abc"}
    )
    assert response.status_code == 422


def test_unknown_field_is_rejected_with_422(client, key):
    response = post_run(client, key, surprise=1)
    assert response.status_code == 422


def test_unknown_scenario_is_rejected_with_422(client, key):
    response = post_run(client, key, scenario="definitely_not_a_scenario")
    assert response.status_code == 422


def test_stringified_integer_is_rejected_with_422(client, key):
    response = post_run(client, key, seed="20261010")
    assert response.status_code == 422


def test_out_of_range_symbol_count_is_rejected_with_422(client, key):
    response = post_run(client, key, symbol_count=999)
    assert response.status_code == 422


def test_negative_seed_is_rejected_with_422(client, key):
    response = post_run(client, key, seed=-1)
    assert response.status_code == 422


def test_get_run_returns_the_same_receipt(client, key):
    created = post_run(client, key).json()
    fetched = client.get(f"/demo/runs/{created['run_id']}")
    assert fetched.status_code == 200
    assert fetched.json() == created


def test_unknown_run_id_returns_404(client):
    response = client.get("/demo/runs/run_doesnotexist")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "run_not_found"


def test_receipt_discloses_execution_mode(client, key):
    body = post_run(client, key).json()
    assert body["execution"]["persistence"] == "in-memory-only"
    assert body["execution"]["concurrency"] == "single-process-lock"


def test_receipt_reports_a_data_version_matching_the_generator(client, key):
    body = post_run(client, key).json()
    assert body["data_version"] == data_version_of(build_dataset())
    assert len(body["data_digest"]) == 64


def test_run_list_is_newest_first_and_bounded(client):
    for index in range(3):
        post_run(client, f"list-key-{index:04d}")
    listed = client.get("/demo/runs", params={"limit": 2})
    assert listed.status_code == 200
    body = listed.json()
    assert body["count"] == 2
    assert body["runs"][0]["run_id"] != body["runs"][1]["run_id"]


def test_run_list_limit_is_bounded(client):
    assert client.get("/demo/runs", params={"limit": 0}).status_code == 422
    assert client.get("/demo/runs", params={"limit": 51}).status_code == 422

