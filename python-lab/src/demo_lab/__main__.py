"""Entry point: python -m demo_lab (uvicorn, loopback only by default).

The default port is 8001 so the documented commands, the smoke-test script and
the README all agree on one value.
"""

from __future__ import annotations

import argparse

import uvicorn


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="demo_lab",
        description=(
            "Run the synthetic-data FastAPI experiment locally. Binds to "
            "127.0.0.1 by default; this is a local demo, not a service to expose."
        ),
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args(argv)

    uvicorn.run(
        "demo_lab.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )
    return 0


if __name__ == "__main__":  # pragma: no cover - manual entry point
    raise SystemExit(main())

