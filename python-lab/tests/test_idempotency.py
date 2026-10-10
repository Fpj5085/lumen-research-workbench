"""Idempotency semantics: replay, conflict, isolation."""

from __future__ import annotations

from .conftest import post_run


def test_replay_returns_an_identical_receipt(client, key):
    first = post_run(client, key)
    second = post_run(client, key)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()


def test_replay_does_not_create_a_second_run(client, key):
    post_run(client, key)
    post_run(client, key)
    health = client.get("/health").json()
    assert health["run_count"] == 1
    assert health["idempotency_keys"] == 1


def test_replay_does_not_advance_the_published_pointer(client, key):
    first = post_run(client, key).json()
    post_run(client, key)
    published = client.get("/demo/published").json()
    assert published["publish_count"] == 1
    assert published["published"]["version"] == first["published_version_after"]


def test_same_key_different_payload_is_a_conflict(client, key):
    post_run(client, key, seed=11)
    conflict = post_run(client, key, seed=12)
    assert conflict.status_code == 409
    detail = conflict.json()["detail"]
    assert detail["code"] == "idempotency_key_reused"
    assert detail["idempotency_key"] == key
    assert detail["bound_run_id"]


def test_conflict_names_the_run_that_owns_the_key(client, key):
    created = post_run(client, key, seed=21).json()
    conflict = post_run(client, key, scenario="research_failed")
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["bound_run_id"] == created["run_id"]


def test_conflict_leaves_the_original_receipt_intact(client, key):
    created = post_run(client, key, seed=31).json()
    post_run(client, key, seed=32)
    fetched = client.get(f"/demo/runs/{created['run_id']}").json()
    assert fetched == created


def test_conflict_does_not_add_a_run(client, key):
    post_run(client, key, seed=41)
    post_run(client, key, seed=42)
    assert client.get("/health").json()["run_count"] == 1


def test_different_keys_with_identical_payload_create_distinct_runs(client):
    first = post_run(client, "distinct-key-aaaa", seed=51).json()
    second = post_run(client, "distinct-key-bbbb", seed=51).json()
    assert first["run_id"] != second["run_id"]
    assert first["data_version"] == second["data_version"]
    assert first["receipt_id"] != second["receipt_id"]
    assert client.get("/health").json()["run_count"] == 2


def test_receipt_echoes_the_key_that_was_used(client, key):
    body = post_run(client, key).json()
    assert body["idempotency_key"] == key
    assert len(body["request_digest"]) == 64


def test_replay_after_a_blocked_run_returns_the_same_block(client, key):
    first = post_run(client, key, scenario="research_failed")
    second = post_run(client, key, scenario="research_failed")
    assert first.status_code == 200
    assert first.json()["outcome"] == "blocked"
    assert first.json() == second.json()

