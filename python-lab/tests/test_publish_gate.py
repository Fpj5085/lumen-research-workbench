"""The publish gate: data moving forward must not publish stale research."""

from __future__ import annotations

from demo_lab.canonical import data_version_of
from demo_lab.synthetic import build_dataset

from .conftest import post_run


def test_success_publishes_and_advances_the_pointer(client, key):
    body = post_run(client, key).json()
    assert body["outcome"] == "published"
    assert body["code"] is None
    assert body["pointer_changed"] is True
    assert body["published_version_before"] is None
    assert body["published_version_after"] is not None

    published = client.get("/demo/published").json()
    assert published["published"]["version"] == body["published_version_after"]
    assert published["published"]["data_version"] == body["data_version"]
    assert published["publish_count"] == 1


def test_published_snapshot_rows_match_the_generator(client, key):
    post_run(client, key, symbol_count=6, bars_per_symbol=30)
    snapshot = client.get("/demo/published").json()["published"]["snapshot"]
    assert snapshot["schema_version"] == "demo-snapshot/1"
    assert snapshot["symbol_total"] == 6
    assert snapshot["row_count"] == 6
    symbols = [row["symbol"] for row in snapshot["rows"]]
    assert sorted(symbols) == [f"DEMO{index:03d}" for index in range(1, 7)]
    changes = [row["change_bp"] for row in snapshot["rows"]]
    assert changes == sorted(changes, reverse=True)
    for row in snapshot["rows"]:
        assert row["bar_count"] == 30
        assert row["volume_total"] > 0


def test_published_snapshot_is_capped_at_twenty_rows(client, key):
    post_run(client, key, symbol_count=24)
    snapshot = client.get("/demo/published").json()["published"]["snapshot"]
    assert snapshot["symbol_total"] == 24
    assert snapshot["row_count"] == 20


def test_research_incomplete_blocks_and_leaves_pointer_unchanged(client):
    good = post_run(client, "gate-key-publish-1").json()
    blocked = post_run(
        client,
        "gate-key-incomplete",
        scenario="research_failed",
        seed=20261011,
    ).json()

    assert blocked["outcome"] == "blocked"
    assert blocked["code"] == "research_incomplete"
    assert blocked["pointer_changed"] is False
    assert blocked["published_version_before"] == good["published_version_after"]
    assert blocked["published_version_after"] == good["published_version_after"]
    assert blocked["research_version"] is None

    published = client.get("/demo/published").json()
    assert published["published"]["version"] == good["published_version_after"]
    assert published["published"]["data_version"] == good["data_version"]
    assert published["publish_count"] == 1


def test_version_mismatch_blocks_and_keeps_the_old_pointer(client):
    good = post_run(client, "gate-key-publish-2").json()
    blocked = post_run(
        client,
        "gate-key-mismatch",
        scenario="version_mismatch",
        seed=20261012,
    ).json()

    assert blocked["outcome"] == "blocked"
    assert blocked["code"] == "version_mismatch"
    assert blocked["pointer_changed"] is False
    assert blocked["published_version_after"] == good["published_version_after"]
    assert blocked["data_version"] != good["data_version"]

    published = client.get("/demo/published").json()
    assert published["published"]["data_version"] == good["data_version"]
    assert published["published"]["version"] == good["published_version_after"]
    assert published["publish_count"] == 1


def test_explicit_stale_research_input_is_blocked(client, key):
    current = data_version_of(build_dataset())
    body = post_run(
        client,
        key,
        research_input_version="dv_" + "0" * 16,
    ).json()
    assert body["outcome"] == "blocked"
    assert body["code"] == "version_mismatch"
    assert body["research_input_version"] == "dv_" + "0" * 16
    assert body["data_version"] == current
    assert body["pointer_changed"] is False


def test_matching_explicit_research_input_publishes(client, key):
    current = data_version_of(build_dataset())
    body = post_run(client, key, research_input_version=current).json()
    assert body["outcome"] == "published"
    assert body["research_input_version"] == current
    assert body["pointer_changed"] is True


def test_caller_expected_version_mismatch_blocks(client, key):
    body = post_run(
        client,
        key,
        expected_data_version="dv_" + "f" * 16,
    ).json()
    assert body["outcome"] == "blocked"
    assert body["code"] == "data_version_mismatch"
    assert body["pointer_changed"] is False


def test_caller_expected_version_match_publishes(client, key):
    current = data_version_of(build_dataset())
    body = post_run(client, key, expected_data_version=current).json()
    assert body["outcome"] == "published"
    assert body["data_version"] == current


def test_data_invalid_blocks_and_skips_downstream(client, key):
    body = post_run(client, key, scenario="data_invalid").json()
    assert body["outcome"] == "blocked"
    assert body["code"] == "data_invalid"
    assert body["pointer_changed"] is False

    statuses = {stage["name"]: stage["status"] for stage in body["stages"]}
    assert statuses["data_validate"] == "failed"
    assert statuses["research"] == "skipped"
    assert statuses["publish"] == "skipped"
    assert client.get("/demo/published").json()["published"] is None


def test_publishing_the_same_data_version_twice_does_not_advance(client):
    first = post_run(client, "dup-key-aaaa-1", seed=99).json()
    second = post_run(client, "dup-key-aaaa-2", seed=99).json()

    assert first["outcome"] == "published"
    assert second["outcome"] == "no_change"
    assert second["code"] == "already_published"
    assert second["pointer_changed"] is False
    assert second["data_version"] == first["data_version"]
    assert second["published_version_after"] == first["published_version_after"]

    published = client.get("/demo/published").json()
    assert published["publish_count"] == 1


def test_publishing_a_newer_data_version_advances(client):
    first = post_run(client, "adv-key-aaaa-1", seed=101).json()
    second = post_run(client, "adv-key-aaaa-2", seed=102).json()

    assert second["outcome"] == "published"
    assert second["published_version_before"] == first["published_version_after"]
    assert second["published_version_after"] != first["published_version_after"]
    assert client.get("/demo/published").json()["publish_count"] == 2


def test_blocked_run_never_becomes_the_published_pointer(client):
    for index, scenario in enumerate(
        ["research_failed", "version_mismatch", "data_invalid"]
    ):
        body = post_run(client, f"never-key-{index:04d}", scenario=scenario).json()
        assert body["outcome"] == "blocked"

    published = client.get("/demo/published").json()
    assert published["published"] is None
    assert published["publish_count"] == 0
    assert published["last_outcome"] == "blocked"

