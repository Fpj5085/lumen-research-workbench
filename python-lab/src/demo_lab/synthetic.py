"""Deterministic synthetic OHLCV generation.

No market data provider is involved. Prices are an integer random walk in
minor units, produced by a local SplitMix64 generator so the output does not
depend on CPython's random module or on any third-party numeric library.

Consequences that matter for the demo:

* the same (seed, symbol_count, bars_per_symbol) triple always yields
  byte-identical canonical JSON, hence an identical dv_ data version;
* a different seed yields a different data version;
* the numbers are meaningless as market data, and are labelled DEMO.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

SCHEMA = "demo-ohlcv/1"
PRICE_SCALE = 100
SYMBOL_PREFIX = "DEMO"

DEFAULT_SEED = 20261010
MAX_SYMBOL_COUNT = 24
MAX_BARS_PER_SYMBOL = 180
END_DATE = date(2026, 6, 30)

_MASK = (1 << 64) - 1
_GOLDEN_GAMMA = 0x9E3779B97F4A7C15
_MIX_A = 0xBF58476D1CE4E5B9
_MIX_B = 0x94D049BB133111EB
_PER_SYMBOL_SALT = 0x9E3779B97F4A7C15

MIN_PRICE_CENTS = 100
MIN_VOLUME = 1_000


class SplitMix64:
    """Tiny deterministic PRNG (SplitMix64).

    SplitMix64 is a well-known public-domain mixing function. It is used here
    instead of random.Random so the synthetic series is pinned to explicit
    integer arithmetic that cannot drift between interpreter versions.
    """

    __slots__ = ("_state",)

    def __init__(self, seed: int) -> None:
        self._state = seed & _MASK

    def next_u64(self) -> int:
        self._state = (self._state + _GOLDEN_GAMMA) & _MASK
        z = self._state
        z = ((z ^ (z >> 30)) * _MIX_A) & _MASK
        z = ((z ^ (z >> 27)) * _MIX_B) & _MASK
        return z ^ (z >> 31)

    def randbelow(self, upper: int) -> int:
        """Return a value in [0, upper).

        The modulo bias of this construction is irrelevant for a synthetic
        demo series; determinism is the property being relied on.
        """

        if upper <= 0:
            raise ValueError("upper must be positive")
        return self.next_u64() % upper


def symbol_names(symbol_count: int) -> list[str]:
    """Return the fictional symbol identifiers, e.g. DEMO001."""

    return [f"{SYMBOL_PREFIX}{index:03d}" for index in range(1, symbol_count + 1)]


def _business_days(end: date, count: int) -> list[str]:
    days: list[str] = []
    cursor = end
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor.isoformat())
        cursor -= timedelta(days=1)
    days.reverse()
    return days


def _bars_for_symbol(seed: int, index: int, dates: list[str]) -> list[dict[str, int | str]]:
    rng = SplitMix64(seed ^ ((index + 1) * _PER_SYMBOL_SALT))
    price = 500 + rng.randbelow(20_000)
    bars: list[dict[str, int | str]] = []
    for day in dates:
        open_cents = price
        drift = rng.randbelow(201) - 100
        close_cents = max(MIN_PRICE_CENTS, open_cents + drift)
        high_cents = max(open_cents, close_cents) + rng.randbelow(60)
        low_cents = max(MIN_PRICE_CENTS // 2, min(open_cents, close_cents) - rng.randbelow(60))
        volume = MIN_VOLUME + rng.randbelow(500_000)
        bars.append(
            {
                "d": day,
                "o": open_cents,
                "h": high_cents,
                "l": low_cents,
                "c": close_cents,
                "v": volume,
            }
        )
        price = close_cents
    return bars


def build_dataset(
    *,
    seed: int = DEFAULT_SEED,
    symbol_count: int = MAX_SYMBOL_COUNT,
    bars_per_symbol: int = MAX_BARS_PER_SYMBOL,
    inject_defect: bool = False,
) -> dict[str, Any]:
    """Build the synthetic dataset.

    inject_defect deliberately corrupts one bar so the validation stage has a
    real, reproducible failure to detect. It is used by the data_invalid demo
    scenario and never by the default path.
    """

    if symbol_count < 1 or symbol_count > MAX_SYMBOL_COUNT:
        raise ValueError(f"symbol_count must be within 1..{MAX_SYMBOL_COUNT}")
    if bars_per_symbol < 1 or bars_per_symbol > MAX_BARS_PER_SYMBOL:
        raise ValueError(f"bars_per_symbol must be within 1..{MAX_BARS_PER_SYMBOL}")

    dates = _business_days(END_DATE, bars_per_symbol)
    records = [
        {"symbol": name, "bars": _bars_for_symbol(seed, index, dates)}
        for index, name in enumerate(symbol_names(symbol_count))
    ]

    if inject_defect and records:
        target = records[min(3, len(records) - 1)]["bars"]
        if len(target) > 10:
            bar = target[10]
            bar["h"] = bar["l"] - 1

    return {
        "schema": SCHEMA,
        "synthetic": True,
        "demo_only": True,
        "symbol_prefix": SYMBOL_PREFIX,
        "price_scale": PRICE_SCALE,
        "price_units": "integer minor units (1 unit = 0.01 DEMO currency)",
        "end_date": END_DATE.isoformat(),
        "bars_per_symbol": bars_per_symbol,
        "symbol_count": symbol_count,
        "records": records,
    }


def validate_dataset(dataset: dict[str, Any]) -> list[str]:
    """Return a list of invariant violations; empty means the dataset is valid.

    These are structural invariants of an OHLCV series (high/low envelope,
    positive prices, monotonic dates, exact counts). They are deliberately not
    business rules and not market-quality thresholds.
    """

    problems: list[str] = []
    records = dataset.get("records")
    if not isinstance(records, list):
        return ["records: expected a list"]

    expected_symbols = dataset.get("symbol_count")
    if expected_symbols != len(records):
        problems.append(f"symbol_count: declared {expected_symbols!r} but found {len(records)} records")

    expected_bars = dataset.get("bars_per_symbol")
    seen: set[str] = set()
    for record in records:
        symbol = record.get("symbol")
        if not isinstance(symbol, str) or not symbol.startswith(SYMBOL_PREFIX):
            problems.append(f"symbol: {symbol!r} is not a {SYMBOL_PREFIX} identifier")
            continue
        if symbol in seen:
            problems.append(f"symbol: duplicate {symbol}")
        seen.add(symbol)

        bars = record.get("bars")
        if not isinstance(bars, list):
            problems.append(f"{symbol}: bars must be a list")
            continue
        if expected_bars != len(bars):
            problems.append(f"{symbol}: declared {expected_bars!r} bars but found {len(bars)}")

        previous_day: str | None = None
        for position, bar in enumerate(bars):
            where = f"{symbol}[{position}]"
            for field in ("o", "h", "l", "c", "v"):
                value = bar.get(field)
                if not isinstance(value, int) or isinstance(value, bool):
                    problems.append(f"{where}.{field}: expected int, got {value!r}")
            day = bar.get("d")
            if not isinstance(day, str):
                problems.append(f"{where}.d: expected date string, got {day!r}")
            elif previous_day is not None and day <= previous_day:
                problems.append(f"{where}.d: {day} is not after {previous_day}")
            else:
                previous_day = day

            open_cents = bar.get("o")
            high_cents = bar.get("h")
            low_cents = bar.get("l")
            close_cents = bar.get("c")
            volume = bar.get("v")
            numeric = (open_cents, high_cents, low_cents, close_cents, volume)
            if not all(isinstance(value, int) and not isinstance(value, bool) for value in numeric):
                continue
            if high_cents < low_cents:
                problems.append(f"{where}: high {high_cents} < low {low_cents}")
            if high_cents < max(open_cents, close_cents):
                problems.append(f"{where}: high {high_cents} below open/close envelope")
            if low_cents > min(open_cents, close_cents):
                problems.append(f"{where}: low {low_cents} above open/close envelope")
            if min(open_cents, high_cents, low_cents, close_cents) <= 0:
                problems.append(f"{where}: non-positive price")
            if volume <= 0:
                problems.append(f"{where}: non-positive volume")

    return problems


def bar_total(dataset: dict[str, Any]) -> int:
    """Total number of bars across all records."""

    return sum(len(record.get("bars", ())) for record in dataset.get("records", ()))

