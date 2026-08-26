"""Process-group lifecycle for one bounded render attempt."""

from __future__ import annotations

import os
import signal


def establish_process_group() -> None:
    """Makes the worker child the leader of its Manim/TeX/FFmpeg process group."""
    os.setsid()


def terminate_process_group(process, term_grace_seconds: float = 15, kill_grace_seconds: float = 5) -> None:
    """Terminates the full attempt tree, then unconditionally applies a kill fallback."""
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    process.join(term_grace_seconds)
    # The Python leader may exit on SIGTERM while a renderer descendant ignores it. Address the
    # group regardless of leader liveness; a vanished group is the normal ProcessLookupError case.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.join(kill_grace_seconds)
