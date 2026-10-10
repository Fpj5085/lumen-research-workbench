r"""Remove local build and cache artifacts before publishing a file listing.

Deletes only directories whose resolved path is inside this python-lab
directory: __pycache__, .pytest_cache and *.egg-info. The virtual environment
is left alone, because removing it would invalidate the documented test
commands.

Usage:

    .\.venv\Scripts\python.exe scripts/clean_local_artifacts.py
"""

from __future__ import annotations

import os
import shutil
import sys

SKIP_DIRS = {".venv", ".git"}
TARGET_NAMES = {"__pycache__", ".pytest_cache"}


def main() -> int:
    base = os.path.realpath(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    targets: list[str] = []

    for root, dirs, _files in os.walk(base):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        for name in dirs:
            if name in TARGET_NAMES or name.endswith(".egg-info"):
                targets.append(os.path.join(root, name))

    removed: list[str] = []
    for target in targets:
        resolved = os.path.realpath(target)
        if not resolved.startswith(base + os.sep):
            print(f"refusing to delete outside the lab: {resolved}", file=sys.stderr)
            return 2
        shutil.rmtree(resolved, ignore_errors=True)
        removed.append(os.path.relpath(resolved, base))

    for path in sorted(removed):
        print(f"removed {path}")
    print(f"removed {len(removed)} path(s); .venv was preserved")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

