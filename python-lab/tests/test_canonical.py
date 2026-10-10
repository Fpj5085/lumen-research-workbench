"""Canonical serialization and digest stability."""

from __future__ import annotations

import pytest

from demo_lab.canonical import (
    canonical_json,
    digest_of,
    version_label,
)


def test_key_order_does_not_affect_digest():
    left = {"b": 2, "a": 1, "c": [3, {"z": 0, "y": 1}]}
    right = {"c": [3, {"y": 1, "z": 0}], "a": 1, "b": 2}
    assert canonical_json(left) == canonical_json(right)
    assert digest_of(left) == digest_of(right)


def test_whitespace_and_separators_are_tight():
    assert canonical_json({"a": 1, "b": [1, 2]}) == '{"a":1,"b":[1,2]}'


def test_non_ascii_is_escaped_so_bytes_are_locale_independent():
    assert canonical_json({"n": "\u6d4b"}) == '{"n":"\\u6d4b"}'


def test_digest_is_64_lowercase_hex():
    digest = digest_of({"a": 1})
    assert len(digest) == 64
    assert digest == digest.lower()
    assert set(digest) <= set("0123456789abcdef")


def test_nan_is_rejected_rather_than_serialized():
    with pytest.raises(ValueError):
        canonical_json({"x": float("nan")})


def test_version_label_is_prefixed_and_truncated():
    label = version_label("dv", "a" * 64, length=16)
    assert label == "dv_" + "a" * 16


@pytest.mark.parametrize("length", [0, -1, 65])
def test_version_label_rejects_out_of_range_length(length):
    with pytest.raises(ValueError):
        version_label("dv", "a" * 64, length=length)

