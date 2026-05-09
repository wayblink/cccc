from __future__ import annotations

from typing import Any, Dict, Optional

from ...contracts.v1 import DaemonError, DaemonResponse
from ..terminal_message_runtime import TerminalMessageRuntimeStore


def _error(code: str, message: str) -> DaemonResponse:
    return DaemonResponse(ok=False, error=DaemonError(code=code, message=message))


def _ok(result: Dict[str, Any]) -> DaemonResponse:
    return DaemonResponse(ok=True, result=result)


def try_handle_terminal_runtime_op(op: str, args: Dict[str, Any]) -> Optional[DaemonResponse]:
    store = TerminalMessageRuntimeStore()
    try:
        if op == "terminal_runtime_port_upsert":
            port = store.upsert_port(
                group_id=str(args.get("group_id") or ""),
                actor_id=str(args.get("actor_id") or ""),
                runtime=str(args.get("runtime") or ""),
                transport=str(args.get("transport") or "pty"),
                provider=str(args.get("provider") or ""),
                native_session_id=str(args.get("native_session_id") or ""),
                cwd=str(args.get("cwd") or ""),
                command=args.get("command") if isinstance(args.get("command"), list) else [],
                port_id=str(args.get("port_id") or ""),
                metadata=args.get("metadata") if isinstance(args.get("metadata"), dict) else {},
            )
            return _ok({"port": port.model_dump()})

        if op == "terminal_runtime_run_start":
            run = store.start_run(
                group_id=str(args.get("group_id") or ""),
                actor_id=str(args.get("actor_id") or ""),
                port_id=str(args.get("port_id") or ""),
                input_text=str(args.get("input_text") or ""),
                metadata=args.get("metadata") if isinstance(args.get("metadata"), dict) else {},
            )
            return _ok({"run": run.model_dump()})

        if op == "terminal_runtime_event_append":
            event = store.append_event(
                group_id=str(args.get("group_id") or ""),
                actor_id=str(args.get("actor_id") or ""),
                port_id=str(args.get("port_id") or ""),
                run_id=str(args.get("run_id") or ""),
                type=str(args.get("type") or "progress"),
                text=str(args.get("text") or ""),
                data=args.get("data") if isinstance(args.get("data"), dict) else {},
            )
            return _ok({"event": event.model_dump()})

        if op == "terminal_runtime_run_complete":
            event = store.complete_run(
                group_id=str(args.get("group_id") or ""),
                actor_id=str(args.get("actor_id") or ""),
                port_id=str(args.get("port_id") or ""),
                run_id=str(args.get("run_id") or ""),
                status=str(args.get("status") or "completed"),
                final_text=str(args.get("final_text") or ""),
                final_message_event_id=str(args.get("final_message_event_id") or ""),
                data=args.get("data") if isinstance(args.get("data"), dict) else {},
            )
            run = store.get_run(str(args.get("group_id") or ""), str(args.get("run_id") or ""))
            return _ok({"event": event.model_dump(), "run": run.model_dump()})

        if op == "terminal_runtime_run_tail":
            events = store.tail_events(
                str(args.get("group_id") or ""),
                str(args.get("run_id") or ""),
                after_seq=int(args.get("after_seq") or 0),
                limit=int(args.get("limit") or 200),
            )
            return _ok({"events": [event.model_dump() for event in events]})
    except ValueError as exc:
        return _error("invalid_args", str(exc))
    except Exception as exc:
        return _error("terminal_runtime_error", str(exc))

    return None
