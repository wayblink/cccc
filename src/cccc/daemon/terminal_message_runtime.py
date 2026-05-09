from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from ..contracts.v1.terminal_runtime import AgentRun, ResumeState, RunEvent, TerminalPort, TerminalRunStatus, RunEventType
from ..paths import ensure_home
from ..util.file_lock import acquire_lockfile, release_lockfile
from ..util.fs import atomic_write_json, read_json
from ..util.time import utc_now_iso

logger = logging.getLogger(__name__)


class TerminalMessageRuntimeStore:
    """Filesystem-backed first-layer terminal message runtime state."""

    def __init__(self, home: Optional[Path] = None) -> None:
        self.home = Path(home).expanduser().resolve() if home is not None else ensure_home()

    def _runtime_dir(self, group_id: str) -> Path:
        return self.home / "groups" / str(group_id) / "state" / "terminal_runtime"

    def _ports_dir(self, group_id: str) -> Path:
        return self._runtime_dir(group_id) / "ports"

    def _runs_dir(self, group_id: str) -> Path:
        return self._runtime_dir(group_id) / "runs"

    def _events_dir(self, group_id: str) -> Path:
        return self._runtime_dir(group_id) / "events"

    def _resume_dir(self, group_id: str) -> Path:
        return self._runtime_dir(group_id) / "resume"

    def _lock_path(self, group_id: str) -> Path:
        return self._runtime_dir(group_id) / "runtime.lock"

    def upsert_port(
        self,
        *,
        group_id: str,
        actor_id: str,
        runtime: str = "",
        transport: str = "pty",
        provider: str = "",
        native_session_id: str = "",
        cwd: str = "",
        command: Optional[List[str]] = None,
        port_id: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TerminalPort:
        group_id = str(group_id or "").strip()
        actor_id = str(actor_id or "").strip()
        existing: dict[str, Any] = {}
        if port_id:
            existing = read_json(self._ports_dir(group_id) / f"{port_id}.json")

        now = utc_now_iso()
        payload = dict(existing) if isinstance(existing, dict) else {}
        payload.update(
            {
                "group_id": group_id,
                "actor_id": actor_id,
                "runtime": str(runtime or "").strip(),
                "transport": str(transport or "pty").strip() or "pty",
                "provider": str(provider or "").strip(),
                "native_session_id": str(native_session_id or "").strip(),
                "cwd": str(cwd or "").strip(),
                "command": [str(part) for part in (command or [])],
                "status": "active",
                "updated_at": now,
                "metadata": metadata if isinstance(metadata, dict) else {},
            }
        )
        payload.setdefault("created_at", now)
        if port_id:
            payload["id"] = str(port_id).strip()
        port = TerminalPort.model_validate(payload)
        atomic_write_json(self._ports_dir(group_id) / f"{port.id}.json", port.model_dump(), indent=2)
        self._write_resume_state(group_id, actor_id, port)
        return port

    def start_run(
        self,
        *,
        group_id: str,
        actor_id: str,
        port_id: str,
        input_text: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AgentRun:
        port = self.get_port(group_id, port_id)
        resume_state = ResumeState(
            provider=port.provider,
            native_session_id=port.native_session_id,
            cwd=port.cwd,
            command=port.command,
            metadata=port.metadata,
        )
        run = AgentRun(
            group_id=group_id,
            actor_id=actor_id,
            port_id=port.id,
            input_text=str(input_text or ""),
            resume_state=resume_state,
            metadata=metadata if isinstance(metadata, dict) else {},
        )
        atomic_write_json(self._runs_dir(group_id) / f"{run.id}.json", run.model_dump(), indent=2)
        return run

    def start_pty_run(
        self,
        *,
        group_id: str,
        actor_id: str,
        runtime: str = "",
        provider: str = "",
        native_session_id: str = "",
        cwd: str = "",
        command: Optional[List[str]] = None,
        input_text: str = "[pty runtime start]",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[TerminalPort, AgentRun]:
        port = self.upsert_port(
            group_id=group_id,
            actor_id=actor_id,
            runtime=runtime,
            transport="pty",
            provider=provider or runtime,
            native_session_id=native_session_id,
            cwd=cwd,
            command=command or [],
            metadata=metadata,
        )
        run = self.start_run(
            group_id=group_id,
            actor_id=actor_id,
            port_id=port.id,
            input_text=input_text,
            metadata=metadata,
        )
        return port, run

    def append_pty_output(
        self,
        *,
        group_id: str,
        actor_id: str,
        port_id: str,
        run_id: str,
        chunk: bytes,
    ) -> RunEvent:
        data = bytes(chunk or b"")
        return self.append_event(
            group_id=group_id,
            actor_id=actor_id,
            port_id=port_id,
            run_id=run_id,
            type="raw_output",
            text=data.decode("utf-8", errors="replace"),
            data={"byte_count": len(data)},
        )

    def append_event(
        self,
        *,
        group_id: str,
        actor_id: str,
        port_id: str,
        run_id: str,
        type: RunEventType,
        text: str = "",
        data: Optional[Dict[str, Any]] = None,
    ) -> RunEvent:
        path = self._events_dir(group_id) / f"{run_id}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        lock = acquire_lockfile(self._lock_path(group_id), blocking=True)
        try:
            next_seq = self._next_seq(group_id, run_id)
            event = RunEvent(
                seq=next_seq,
                group_id=group_id,
                actor_id=actor_id,
                port_id=port_id,
                run_id=run_id,
                type=type,
                text=str(text or ""),
                data=data if isinstance(data, dict) else {},
            )
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(event.model_dump(), ensure_ascii=False) + "\n")
        finally:
            release_lockfile(lock)
        return event

    def complete_run(
        self,
        *,
        group_id: str,
        actor_id: str,
        port_id: str,
        run_id: str,
        final_text: str,
        final_message_event_id: str = "",
        status: TerminalRunStatus = "completed",
        data: Optional[Dict[str, Any]] = None,
    ) -> RunEvent:
        final_event = self.append_event(
            group_id=group_id,
            actor_id=actor_id,
            port_id=port_id,
            run_id=run_id,
            type="final",
            text=str(final_text or ""),
            data=data if isinstance(data, dict) else {},
        )
        run = self.get_run(group_id, run_id)
        updated = AgentRun.model_validate(
            {
                **run.model_dump(),
                "status": status,
                "ended_at": utc_now_iso(),
                "final_message_event_id": str(final_message_event_id or ""),
            }
        )
        atomic_write_json(self._runs_dir(group_id) / f"{run_id}.json", updated.model_dump(), indent=2)
        return final_event

    def get_port(self, group_id: str, port_id: str) -> TerminalPort:
        payload = read_json(self._ports_dir(group_id) / f"{port_id}.json")
        return TerminalPort.model_validate(payload)

    def get_run(self, group_id: str, run_id: str) -> AgentRun:
        payload = read_json(self._runs_dir(group_id) / f"{run_id}.json")
        return AgentRun.model_validate(payload)

    def tail_events(self, group_id: str, run_id: str, *, after_seq: int = 0, limit: int = 200) -> List[RunEvent]:
        path = self._events_dir(group_id) / f"{run_id}.jsonl"
        events: list[RunEvent] = []
        if not path.exists():
            return []
        max_items = max(1, min(int(limit or 200), 1000))
        floor = int(after_seq or 0)
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    event = RunEvent.model_validate(json.loads(line))
                except Exception:
                    continue
                if int(event.seq or 0) <= floor:
                    continue
                events.append(event)
                if len(events) >= max_items:
                    break
        return events

    def _next_seq(self, group_id: str, run_id: str) -> int:
        last = 0
        for event in self.tail_events(group_id, run_id, after_seq=0, limit=1000):
            last = max(last, int(event.seq or 0))
        return last + 1

    def _write_resume_state(self, group_id: str, actor_id: str, port: TerminalPort) -> None:
        resume = ResumeState(
            provider=port.provider,
            native_session_id=port.native_session_id,
            cwd=port.cwd,
            command=port.command,
            metadata=port.metadata,
        )
        atomic_write_json(self._resume_dir(group_id) / f"{actor_id}.json", resume.model_dump(), indent=2)


def create_pty_output_recorder(
    *,
    group_id: str,
    actor_id: str,
    runtime: str = "",
    runner: str = "",
    runner_effective: str = "",
    cwd: str = "",
    command: Optional[List[str]] = None,
) -> Callable[[Any, bytes], None]:
    """Create a best-effort PTY output sink for the terminal message runtime."""

    store = TerminalMessageRuntimeStore()
    try:
        port, run = store.start_pty_run(
            group_id=group_id,
            actor_id=actor_id,
            runtime=runtime,
            provider=runtime,
            cwd=cwd,
            command=command or [],
            metadata={"runner": runner, "runner_effective": runner_effective},
        )
    except Exception:
        logger.exception("failed to initialize terminal runtime stream for %s/%s", group_id, actor_id)

        def _noop(_session: Any, _chunk: bytes) -> None:
            return

        return _noop

    def _record(_session: Any, chunk: bytes) -> None:
        try:
            store.append_pty_output(
                group_id=group_id,
                actor_id=actor_id,
                port_id=port.id,
                run_id=run.id,
                chunk=chunk,
            )
        except Exception:
            logger.exception("failed to append terminal runtime output for %s/%s", group_id, actor_id)

    return _record
