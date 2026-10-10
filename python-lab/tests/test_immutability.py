"""Receipts and published snapshots are immutable once stored."""

from __future__ import annotations

from .conftest import post_run


def test_mutating_a_fetched_receipt_does_not_change_stored_state(client, key):
    created = post_run(client, key).json()
    created["outcome"] = "tampered"
    created["stages"].clear()
    created["published_version_after"] = "pub_tampered"

    refetched = client.get(f"/demo/runs/{created['run_id']}").json()
    assert refetched["outcome"] == "published"
    assert refetched["published_version_after"] != "pub_tampered"
    assert refetched["stages"]


def test_mutating_a_fetched_snapshot_does_not_change_stored_state(client, key):
    post_run(client, key)
    published = client.get("/demo/published").json()
    published["published"]["snapshot"]["rows"].clear()
    published["published"]["version"] = "pub_tampered"

    again = client.get("/demo/published").json()
    assert again["published"]["version"] != "pub_tampered"
    assert again["published"]["snapshot"]["rows"]


def test_mutating_a_listed_receipt_does_not_change_stored_state(client, key):
    post_run(client, key)
    listed = client.get("/demo/runs").json()
    listed["runs"][0]["outcome"] = "tampered"

    refetched = client.get(f"/demo/runs/{listed['runs'][0]['run_id']}").json()
    assert refetched["outcome"] == "published"


def test_replayed_receipt_is_not_shared_with_the_caller(client, key):
    first = post_run(client, key).json()
    first["message"] = "tampered"
    second = post_run(client, key).json()
    assert second["message"] != "tampered"


def test_published_snapshot_is_digest_verifiable(client, key):
    from demo_lab.canonical import digest_of

    post_run(client, key)
    pointer = client.get("/demo/published").json()["published"]
    assert pointer["snapshot_digest"] == digest_of(pointer["snapshot"])

