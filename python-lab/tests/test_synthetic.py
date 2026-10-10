"""Synthetic generator determinism and invariants."""

from __future__ import annotations

import pytest

from demo_lab.canonical import data_version_of, digest_of
from demo_lab.synthetic import (
    MAX_BARS_PER_SYMBOL,
    MAX_SYMBOL_COUNT,
    build_dataset,
    bar_total,
    symbol_names,
    validate_dataset,
)


def test_default_shape_is_24_by_180():
    dataset = build_dataset()
    assert dataset["symbol_count"] == 24
    assert dataset["bars_per_symbol"] == 180
    assert len(dataset["records"]) == 24
    assert bar_total(dataset) == 24 * 180 == 4320


def test_default_dataset_passes_its_own_invariants():
    assert validate_dataset(build_dataset()) == []


def test_same_seed_is_byte_identical_and_same_version():
    first = build_dataset(seed=1234)
    second = build_dataset(seed=1234)
    assert digest_of(first) == digest_of(second)
    assert data_version_of(first) == data_version_of(second)


def test_different_seed_changes_the_data_version():
    assert data_version_of(build_dataset(seed=1)) != data_version_of(build_dataset(seed=2))


def test_symbols_are_fictional_and_unique():
    dataset = build_dataset(symbol_count=5)
    symbols = [record["symbol"] for record in dataset["records"]]
    assert symbols == symbol_names(5)
    assert len(set(symbols)) == 5
    assert all(symbol.startswith("DEMO") for symbol in symbols)


def test_every_bar_satisfies_ohlc_envelope():
    dataset = build_dataset(symbol_count=3, bars_per_symbol=40)
    for record in dataset["records"]:
        for bar in record["bars"]:
            assert bar["h"] >= max(bar["o"], bar["c"])
            assert bar["l"] <= min(bar["o"], bar["c"])
            assert bar["l"] > 0
            assert bar["v"] > 0


def test_dates_are_strictly_increasing_and_weekdays_only():
    dataset = build_dataset(symbol_count=1, bars_per_symbol=30)
    days = [bar["d"] for bar in dataset["records"][0]["bars"]]
    assert days == sorted(days)
    assert len(set(days)) == len(days)


def test_injected_defect_is_detected():
    dataset = build_dataset(inject_defect=True)
    problems = validate_dataset(dataset)
    assert problems, "the injected defect must be reported"
    assert any("high" in problem for problem in problems)


def test_injected_defect_does_not_change_the_clean_digest():
    clean = build_dataset(seed=7)
    defect = build_dataset(seed=7, inject_defect=True)
    assert digest_of(clean) != digest_of(defect)
    assert data_version_of(clean) != data_version_of(defect)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"symbol_count": 0},
        {"symbol_count": MAX_SYMBOL_COUNT + 1},
        {"bars_per_symbol": 0},
        {"bars_per_symbol": MAX_BARS_PER_SYMBOL + 1},
    ],
)
def test_out_of_range_sizes_are_rejected(kwargs):
    with pytest.raises(ValueError):
        build_dataset(**kwargs)


def test_validation_reports_a_tampered_envelope():
    dataset = build_dataset(symbol_count=2, bars_per_symbol=20)
    dataset["records"][0]["bars"][0]["h"] = 1
    problems = validate_dataset(dataset)
    assert any("envelope" in problem or "high" in problem for problem in problems)

