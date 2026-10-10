"""Concurrency contract for the in-memory store.

The store serializes the fingerprint check and the receipt write under one
re-entrant lock, so concurrent identical requests must collapse to a single
run and a single published pointer. These tests drive real concurrency rather
than asserting the claim in prose.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest
from fastapi.testclient import TestClient

from demo_lab.app import create_app
from demo_lab.store import DemoStore

HEADERS = {"Idempotency-Key": "concurrent-key-0001"}
PAYLOAD = {"scenario": "success", "seed": 4242, "symbol_count": 6, "bars_per_symbol": 30}


def test_threaded_identical_requests_collapse_to_one_run(store):
    app = create_app(store=store)
    with TestClient(app) as client:
        def send(_: int) -> tuple[int, str]:
            response = client.post("/demo/runs", json=PAYLOAD, headers=HEADERS)
            return response.status_code, response.json()["run_id"]

        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(send, range(16)))

    statuses = {status for status, _ in results}
    run_ids = {run_id for _, run_id in results}
    assert statuses == {200}
    assert len(run_ids) == 1
    assert store.health()["run_count"] == 1
    assert store.health()["publish_count"] == 1


@pytest.mark.anyio
async def test_async_identical_requests_collapse_to_one_run(store):
    app = create_app(store=store)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://demo") as client:
        responses = await asyncio.gather(
            *(
                client.post("/demo/runs", json=PAYLOAD, headers=HEADERS)
                for _ in range(12)
            )
        )

    assert {response.status_code for response in responses} == {200}
    bodies = [response.json() for response in responses]
    assert len({body["run_id"] for body in bodies}) == 1
    assert all(body == bodies[0] for body in bodies)
    assert store.health()["run_count"] == 1
    assert store.health()["publish_count"] == 1


@pytest.mark.anyio
async def test_async_conflicting_payloads_never_both_win(store):
    app = create_app(store=store)
    transport = httpx.ASGITransport(app=app)
    payloads = [
        {"scenario": "success", "seed": 5000 + index, "symbol_count": 4, "bars_per_symbol": 20}
        for index in range(6)
    ]
    async with httpx.AsyncClient(transport=transport, base_url="http://demo") as client:
        responses = await asyncio.gather(
            *(
                client.post("/demo/runs", json=payload, headers=HEADERS)
                for payload in payloads
            )
        )

    statuses = sorted(response.status_code for response in responses)
    assert statuses.count(200) == 1
    assert statuses.count(409) == len(payloads) - 1
    assert store.health()["run_count"] == 1


@pytest.mark.anyio
async def test_concurrent_distinct_keys_each_get_their_own_receipt(store):
    app = create_app(store=store)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://demo") as client:
        responses = await asyncio.gather(
            *(
                client.post(
                    "/demo/runs",
                    json={"scenario": "success", "seed": 6000 + index,
                          "symbol_count": 4, "bars_per_symbol": 20},
                    headers={"Idempotency-Key": f"distinct-concurrent-{index:04d}"},
                )
                for index in range(6)
            )
        )

    assert {response.status_code for response in responses} == {200}
    assert len({response.json()["run_id"] for response in responses}) == 6
    # Distinct seeds mean distinct data versions, so every publish advances.
    assert store.health()["publish_count"] == 6


def test_store_uses_a_reentrant_lock():
    import threading

    store = DemoStore()
    lock = store._lock
    assert isinstance(lock, type(threading.RLock()))

