from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import shlex
import threading
import time
from typing import Any, Dict, Optional, Tuple

from ...paths import ensure_home
from ...runners.pty import PtySession
from ...util.time import utc_now_iso
from .script_store import load_last_output, write_last_output

_SCRIPT_GROUP_ID = "__scripts__"
_DEFAULT_BACKLOG_BYTES = 2_000_000


class ScriptRuntimeError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = str(code or "script_runtime_error")
        self.message = str(message or "script runtime error")


@dataclass
class _RuntimeEntry:
    session: Optional[PtySession] = None
    status: str = "idle"
    pid: int = 0
    started_at: str = ""
    ended_at: str = ""
    stop_requested: bool = False


class ScriptRuntimeManager:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._entries: Dict[Tuple[str, str], _RuntimeEntry] = {}

    def _key(self, *, home: Path, script_id: str) -> Tuple[str, str]:
        return (str(home), str(script_id or "").strip())

    def _entry(self, *, home: Path, script_id: str) -> _RuntimeEntry:
        key = self._key(home=home, script_id=script_id)
        with self._lock:
            existing = self._entries.get(key)
            if existing is None:
                existing = _RuntimeEntry()
                self._entries[key] = existing
            return existing

    def _build_runtime(self, entry: _RuntimeEntry) -> Dict[str, Any]:
        runtime: Dict[str, Any] = {
            "status": "running" if entry.session is not None and entry.session.is_running() else "idle",
        }
        if entry.started_at:
            runtime["started_at"] = entry.started_at
        if entry.ended_at:
            runtime["ended_at"] = entry.ended_at
        if entry.session is not None and entry.session.is_running():
            runtime["pid"] = entry.pid
        return runtime

    def get_runtime(self, script_id: str, *, home: Optional[Path] = None) -> Dict[str, Any]:
        base = home or ensure_home()
        entry = self._entry(home=base, script_id=script_id)
        return self._build_runtime(entry)

    def run(self, script: Dict[str, Any], *, home: Optional[Path] = None) -> Dict[str, Any]:
        base = home or ensure_home()
        script_id = str(script.get("id") or "").strip()
        if not script_id:
            raise ScriptRuntimeError("missing_script_id", "missing script id")

        cwd_raw = str(script.get("cwd") or ".")
        cwd = Path(cwd_raw).expanduser()
        if not cwd.exists() or not cwd.is_dir():
            raise ScriptRuntimeError("invalid_cwd", f"cwd not found: {cwd_raw}")
        command = str(script.get("command") or "").strip()
        if not command:
            raise ScriptRuntimeError("invalid_command", "command is required")

        entry = self._entry(home=base, script_id=script_id)
        with self._lock:
            if entry.session is not None and entry.session.is_running():
                raise ScriptRuntimeError("script_already_running", f"script already running: {script_id}")
            started_at = utc_now_iso()
            entry.status = "running"
            entry.started_at = started_at
            entry.ended_at = ""
            entry.stop_requested = False

        proc_env = {
            str(k): str(v)
            for k, v in ((script.get("env") or {}) if isinstance(script.get("env"), dict) else {}).items()
            if str(k or "").strip()
        }
        proc_env.setdefault("CCCC_HOME", str(base))

        def _on_exit(session: PtySession) -> None:
            self._handle_exit(home=base, script_id=script_id, session=session)

        session = PtySession(
            group_id=_SCRIPT_GROUP_ID,
            actor_id=script_id,
            cwd=cwd,
            command=self._shell_command(command, cwd_raw=cwd_raw),
            env=proc_env,
            on_exit=_on_exit,
            runtime="script",
            max_backlog_bytes=_DEFAULT_BACKLOG_BYTES,
        )
        with self._lock:
            entry.session = session
            entry.pid = session.pid
        return self._build_runtime(entry)

    def stop(self, script_id: str, *, home: Optional[Path] = None) -> Dict[str, Any]:
        base = home or ensure_home()
        entry = self._entry(home=base, script_id=script_id)
        session: Optional[PtySession] = None
        with self._lock:
            if entry.session is not None and entry.session.is_running():
                entry.stop_requested = True
                session = entry.session
        if session is not None:
            self._wait_for_initial_output(session)
            session.stop()
        return self._build_runtime(entry)

    def restart(self, script: Dict[str, Any], *, home: Optional[Path] = None) -> Dict[str, Any]:
        base = home or ensure_home()
        script_id = str(script.get("id") or "").strip()
        entry = self._entry(home=base, script_id=script_id)
        session: Optional[PtySession] = None
        with self._lock:
            if entry.session is not None and entry.session.is_running():
                entry.stop_requested = True
                session = entry.session
        if session is not None:
            self._wait_for_initial_output(session)
            session.stop()
            deadline = time.time() + 5.0
            while time.time() < deadline:
                with self._lock:
                    running = entry.session is not None and entry.session.is_running()
                if not running:
                    break
                time.sleep(0.05)
        return self.run(script, home=base)

    def attach(self, script_id: str, *, home: Optional[Path] = None) -> Dict[str, Any]:
        base = home or ensure_home()
        entry = self._entry(home=base, script_id=script_id)
        runtime = self._build_runtime(entry)
        with self._lock:
            session = entry.session
        if session is not None and session.is_running():
            self._wait_for_initial_output(session)
            text = session.tail_output(max_bytes=_DEFAULT_BACKLOG_BYTES).decode("utf-8", errors="replace")
            return {
                "script_id": script_id,
                "runtime": runtime,
                "output": {
                    "script_id": script_id,
                    "result": "running",
                    "text": text,
                    "started_at": entry.started_at,
                    "ended_at": "",
                    "truncated": False,
                },
            }
        return {
            "script_id": script_id,
            "runtime": runtime,
            "output": load_last_output(script_id, home=base) or {
                "script_id": script_id,
                "result": "idle",
                "text": "",
                "started_at": "",
                "ended_at": "",
                "truncated": False,
            },
        }

    def remove(self, script_id: str, *, home: Optional[Path] = None) -> None:
        base = home or ensure_home()
        key = self._key(home=base, script_id=script_id)
        session: Optional[PtySession] = None
        with self._lock:
            entry = self._entries.get(key)
            if entry is not None and entry.session is not None and entry.session.is_running():
                entry.stop_requested = True
                session = entry.session
        if session is not None:
            session.stop()
        with self._lock:
            self._entries.pop(key, None)

    def _handle_exit(self, *, home: Path, script_id: str, session: PtySession) -> None:
        key = self._key(home=home, script_id=script_id)
        ended_at = utc_now_iso()
        text = session.tail_output(max_bytes=_DEFAULT_BACKLOG_BYTES).decode("utf-8", errors="replace")
        exit_code = getattr(getattr(session, "_proc", None), "returncode", None)
        with self._lock:
            entry = self._entries.get(key)
            started_at = entry.started_at if entry is not None else ""
            stop_requested = bool(entry.stop_requested) if entry is not None else False
            if entry is not None:
                entry.session = None
                entry.status = "idle"
                entry.pid = 0
                entry.ended_at = ended_at
                entry.stop_requested = False
        result = "stopped" if stop_requested else "success" if int(exit_code or 0) == 0 else "failed"
        write_last_output(
            script_id,
            {
                "script_id": script_id,
                "result": result,
                "text": text,
                "started_at": started_at,
                "ended_at": ended_at,
                "exit_code": exit_code,
                "truncated": False,
            },
            home=home,
        )

    @staticmethod
    def _shell_command(command: str, *, cwd_raw: str = "") -> list[str]:
        shell = "/bin/bash" if Path("/bin/bash").exists() else "/bin/sh"
        prefix = ""
        if cwd_raw:
            prefix = f"export PWD={shlex.quote(cwd_raw)}; "
        return [shell, "-lc", f"{prefix}{command}"]

    @staticmethod
    def _wait_for_initial_output(session: PtySession, *, timeout_s: float = 0.4) -> None:
        deadline = time.time() + max(0.0, float(timeout_s))
        while time.time() < deadline:
            try:
                if session.first_output_at_monotonic() is not None:
                    return
                if session.tail_output(max_bytes=256):
                    return
            except Exception:
                return
            time.sleep(0.02)


SCRIPT_RUNTIME = ScriptRuntimeManager()
