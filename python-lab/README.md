# LUMEN Python Lab

A small, self-contained FastAPI experiment that demonstrates one engineering
idea: **a data update must not publish research that was computed against an
older data version.**

This package was written from scratch for a job-application demo. It is an
independent experiment, not a release, an extract or a redacted copy of any
private production system. There is no shared code, data, credential, path or
configuration with any other project.

## What it actually is

Everything below is part of the contract, not a disclaimer appended at the end:

* **All data is synthetic.** 24 fictional symbols (DEMO001 ... DEMO024) with 180
  business-day OHLCV bars each, generated in-process from a fixed seed by a
  local SplitMix64 generator. No market feed, no CSV, no download.
* **Everything is in memory.** Runs, idempotency receipts and the published
  pointer live in a single process dictionary. Restarting the service resets
  all state to empty.
* **Execution is synchronous.** The pipeline stages run inline inside the
  request handler. There is no broker, no worker pool, no scheduler and no
  database. The API says so in every response.
* **No network egress.** Nothing in this package opens an outbound connection,
  reads a secret, or accepts a filesystem path from a request.
* **It is decoupled from the static site.** The static demo front end never
  calls this service, and this service installs no CORS middleware because no
  browser origin is meant to call it.

Numbers here are meaningless as market data. Nothing in this package is
investment advice, a trading signal, a strategy or a recommendation.

## What it demonstrates

The pipeline has seven observable stages:

    data_generate -> data_validate -> version_check -> research -> gate -> candidate -> publish

Two properties are worth more than the rest, and both are proven by tests:

**1. The data version is a hash, not a label.** The dataset is serialized with
canonical JSON (sorted keys, tight separators, escaped non-ASCII) and hashed
with SHA-256. The same seed therefore always yields the same version; a
different seed yields a different one. The version is recomputed from content,
so it cannot be assigned by hand. A caller may also pass an
`expected_data_version`; if the regenerated dataset does not hash to it, the
run is blocked.

**2. The publish pointer does not move when the inputs disagree.** The gate
compares the research output's declared input version against the current data
version. On a mismatch the run is blocked, the previously published pointer is
retained byte-for-byte, and the old snapshot is never relabelled with the new
data date. Blocked runs are still stored and queryable, so the refusal is
auditable rather than silent.

Idempotency is the third property: `POST /demo/runs` requires an
`Idempotency-Key` header. Replaying the same key with the same payload returns
the identical stored receipt. Reusing a key with a *different* payload is
rejected with HTTP 409 and names the run that owns the key.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness plus the execution-mode disclosure |
| POST | `/demo/runs` | Runs the pipeline. Requires `Idempotency-Key` |
| GET | `/demo/runs/{run_id}` | Fetches one stored receipt |
| GET | `/demo/runs` | Lists recent receipts, newest first (`limit` 1-50) |
| GET | `/demo/published` | Current published pointer, or `null` |

Interactive docs are served at `/docs` while the process runs.

### Request body for POST /demo/runs

All fields are optional; unknown fields are rejected with HTTP 422.

| Field | Type | Default | Purpose |
|---|---|---|---|
| `scenario` | success / research_failed / version_mismatch / data_invalid | `success` | Which demo path to exercise |
| `seed` | int 0 ... 4294967295 | 20261010 | Synthetic generator seed |
| `symbol_count` | int 1 ... 24 | 24 | Demo compute guard, not a business rule |
| `bars_per_symbol` | int 1 ... 180 | 180 | Demo compute guard, not a business rule |
| `research_input_version` | string <= 64 | derived | Data version the research claims to have consumed |
| `expected_data_version` | string <= 64 | none | Caller's assertion about the data version |

The numeric bounds cap how much synthetic data one request may materialize.
They are compute guards for a demo, not market thresholds or strategy rules.

### Scenarios

| Scenario | What happens | Outcome |
|---|---|---|
| `success` | Everything lines up | `published`, pointer advances |
| `research_failed` | Research stage reports incomplete | `blocked` / `research_incomplete` |
| `version_mismatch` | Research consumed an older data version | `blocked` / `version_mismatch` |
| `data_invalid` | A bar is corrupted; validation catches it | `blocked` / `data_invalid`, downstream skipped |

Two further blocked codes exist for caller-supplied assertions:
`data_version_mismatch` (expected version differs from the regenerated one) and
`already_published` (the candidate's data version is already live, so the
pointer is left alone and the outcome is `no_change`).

## Quick start

Requires Python 3.12 or 3.13.

    cd python-lab
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
    .\.venv\Scripts\python.exe -m pip install -e .
    .\.venv\Scripts\python.exe -m pytest -q

On macOS or Linux use `.venv/bin/python` in place of
`.venv\Scripts\python.exe`.

Run the service on loopback:

    .\.venv\Scripts\python.exe -m demo_lab --port 8001

Then, in another shell:

    curl -s http://127.0.0.1:8001/health

    curl -s -X POST http://127.0.0.1:8001/demo/runs \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: demo-key-0001" \
      -d "{\"scenario\":\"success\"}"

    curl -s http://127.0.0.1:8001/demo/published

Re-send the identical POST and you get the identical receipt back, with no new
run recorded and no second publish.

## Thread-safety and concurrency

A single re-entrant lock guards every read and every mutation, and an entire run
executes while that lock is held. Two guarantees follow:

* **Idempotency is atomic.** The fingerprint check and the receipt write cannot
  be interleaved, so one key can never end up bound to two payloads.
* **Publishing is single-flight.** Concurrent identical requests serialize and
  the pointer advances at most once per distinct data version.

The cost is that concurrent runs do not overlap. That is acceptable for a
synchronous, in-process experiment, and it is precisely why this is not
presented as queue-backed production behaviour. The concurrency tests drive
real threaded and asyncio concurrency against the store rather than asserting
the claim in prose.

## Limitations

* State is lost on restart. There is no persistence, no SQLite, no migration.
* The lock is process-local. Multiple worker processes would each have their own
  store, so this design is single-process by construction.
* "Stages" are function calls in one handler, not a workflow engine. Stage
  timing is not measured and no latency claim is made.
* The dataset is 4,320 bars; the leaderboard aggregates them in-process. This is
  not a performance or scale demonstration.
* The synthetic generator is a random walk with fixed arithmetic. It is not a
  market model and its output has no predictive meaning.
* There is no authentication, because there is no deployment. Do not expose it.

## Layout

    python-lab/
      pyproject.toml            packaging, minimal dependency set
      requirements.txt          runtime dependencies
      requirements-dev.txt      test dependencies
      src/demo_lab/
        canonical.py            canonical JSON + SHA-256 version labels
        synthetic.py            deterministic OHLCV generator and invariants
        models.py               strict Pydantic request/response contracts
        store.py                in-memory store, gate and publish pointer
        app.py                  FastAPI surface
        __main__.py             python -m demo_lab entry point
      tests/                    pytest suite
      scripts/verify.ps1        one-shot verification with saved output
      scripts/live_smoke.py     end-to-end checks against a running server
      scripts/clean_local_artifacts.py
                                removes local caches before publishing a listing

## Verification

    .\.venv\Scripts\python.exe -m pytest -q

`scripts/verify.ps1` runs the suite and writes the literal console output plus
the exit code to `.local-verification/`, which is ignored by version control.

With the server running on port 8001, `scripts/live_smoke.py` drives real HTTP
against a real uvicorn process (12 checks covering publish, replay, conflict,
each blocked scenario, the frozen pointer and input validation):

    .\.venv\Scripts\python.exe scripts/live_smoke.py

The pytest suite exercises the same behaviour in-process, which is faster but
does not prove the server actually binds and serves. Both are run before this
package is presented as working.

Current results, Python 3.12.10 on Windows:

| Command | Literal result | Exit |
|---|---|---|
| `python -m pytest -q` | `72 passed, 1 warning in 1.56s` | 0 |
| `python scripts/live_smoke.py` | `checks: 12  passed: 12  failed: 0` | 0 |

The single warning comes from Starlette's own test client deprecation notice
about `httpx`; it is not raised by this package.

## Dependency audit

Both dependency sets are audited with `pip-audit` against the public advisory
database. Re-run with:

    pip-audit -r requirements.txt
    pip-audit -r requirements-dev.txt

Latest result: `No known vulnerabilities found` for both, exit code 0. The
resolved dev set was also checked as JSON: 22 dependencies, 0 with advisories,
including `pytest 9.1.1` and `anyio 4.15.1`.

### Why pytest is pinned at >= 9.0.3

`pytest 8.4.2` is affected by PYSEC-2026-1845 / CVE-2025-71176 /
GHSA-6w46-j5rx-g56g, fixed in `9.0.3`. The dev requirements therefore require
`pytest>=9.0.3,<10.0` and the project's own `minversion` is 9.0.3. The whole
suite passes unchanged on pytest 9; no test was modified or skipped to reach
that state.

### Verification history

An earlier run recorded `72 passed` under `pytest 8.4.2`. That figure is
superseded by the audit-driven upgrade above; it is kept here only so the
timeline is not rewritten. The test count and the behaviour asserted are the
same in both runs, and the synthetic digests are byte-identical across the
upgrade, which is the intended property of a deterministic generator.

## Provenance

Written from scratch as an independent experiment for a job application. The
implementation, the data generator, the contracts and the tests are original to
this directory. No private project code, data, rules, credentials, logs or
screenshots were copied, referenced at runtime or linked from here.

