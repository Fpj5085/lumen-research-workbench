"""Shared fixtures.

Each test gets a fresh app and a fresh store, which mirrors the in-memory
lifecycle: a restart starts from nothing.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from demo_lab.app import create_app
from demo_lab.store import DemoStore


@pytest.fixture()
def store() -> DemoStore:
    return DemoStore()


@pytest.fixture()
def anyio_backend() -> str:
    """Run async tests on asyncio only; the demo targets a single event loop."""

    return "asyncio"


@pytest.fixture()
def client(store: DemoStore):
    app = create_app(store=store)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def key() -> str:
    """A fresh, well-formed idempotency key."""

    return f"key-{uuid.uuid4().hex}"


def post_run(client, key: str, **payload):
    body = {"scenario": "success"}
    body.update(payload)
    return client.post("/demo/runs", json=body, headers={"Idempotency-Key": key})

