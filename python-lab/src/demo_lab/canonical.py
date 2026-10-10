"""Canonical JSON serialization and SHA-256 digests.

The whole experiment leans on one property: two logically identical payloads
must produce byte-identical JSON, so a SHA-256 over those bytes is a stable
version identifier. That is what makes the data version and the idempotency
receipts verifiable instead of decorative.

Rules:

* object keys are sorted;
* separators are the tightest possible (comma and colon, no spaces);
* non-ASCII is escaped so the bytes never depend on the writer's locale;
* NaN and Infinity are rejected rather than silently serialized.

The synthetic dataset only carries integers, so no float formatting behaviour
is involved in the digests.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

DATA_VERSION_PREFIX = "dv"
RESEARCH_VERSION_PREFIX = "rv"


def canonical_json(obj: Any) -> str:
    """Return the canonical JSON text for obj."""

    return json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
        allow_nan=False,
    )


def canonical_bytes(obj: Any) -> bytes:
    """Return the canonical UTF-8 encoding used for hashing."""

    return canonical_json(obj).encode("utf-8")


def sha256_hex(payload: bytes) -> str:
    """Return the lowercase hex SHA-256 of payload."""

    return hashlib.sha256(payload).hexdigest()


def digest_of(obj: Any) -> str:
    """Return the hex SHA-256 of the canonical form of obj."""

    return sha256_hex(canonical_bytes(obj))


def version_label(prefix: str, digest: str, length: int = 16) -> str:
    """Build a short, human-scannable version label such as dv_1f3c9a...."""

    if length <= 0 or length > len(digest):
        raise ValueError("length must be between 1 and the digest length")
    return f"{prefix}_{digest[:length]}"


def data_version_of(dataset: Any) -> str:
    """Derive the dataset version label from the dataset content."""

    return version_label(DATA_VERSION_PREFIX, digest_of(dataset))


def research_version_of(research_payload: Any) -> str:
    """Derive the research version label from the research output."""

    return version_label(RESEARCH_VERSION_PREFIX, digest_of(research_payload))

