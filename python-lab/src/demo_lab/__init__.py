"""Independent synthetic-data experiment used as a job-application demo.

Everything in this package is local, synthetic and in-memory:

* no market data provider, no network egress, no secrets;
* no database, no queue, no background worker, no scheduler;
* all prices, volumes and identifiers are generated from a fixed seed.

This package was written from scratch for this demo. It is not a release, an
extract or a redacted copy of any private production system.
"""

from __future__ import annotations

__all__ = ["__version__"]

__version__ = "0.1.0"

