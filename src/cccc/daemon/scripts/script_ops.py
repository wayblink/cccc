from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from ...contracts.v1 import DaemonError, DaemonResponse
from ...paths import ensure_home
from .script_runtime import SCRIPT_RUNTIME, ScriptRuntimeError
from .script_store import (
    create_script,
    delete_script,
    get_script,
    list_scripts,
    load_last_output,
    update_script,
)


def _error(code: str, message: str, *, details: Optional[Dict[str, Any]] = None) -> DaemonResponse:
    return DaemonResponse(ok=False, error=DaemonError(code=code, message=message, details=(details or {})))


def _script_detail(script: Dict[str, Any], *, home: Optional[Path] = None) -> Dict[str, Any]:
    base = home or ensure_home()
    script_id = str(script.get("id") or "").strip()
    return {
        "script": dict(script),
        "runtime": SCRIPT_RUNTIME.get_runtime(script_id, home=base),
        "last_output": load_last_output(script_id, home=base),
    }


def _require_script_id(args: Dict[str, Any]) -> str:
    return str(args.get("script_id") or "").strip()


def handle_script_list(args: Dict[str, Any]) -> DaemonResponse:
    base = ensure_home()
    items = list_scripts(home=base)
    return DaemonResponse(ok=True, result={"scripts": items})


def handle_script_get(args: Dict[str, Any]) -> DaemonResponse:
    script_id = _require_script_id(args)
    if not script_id:
        return _error("missing_script_id", "missing script_id")
    base = ensure_home()
    script = get_script(script_id, home=base)
    if script is None:
        return _error("script_not_found", f"script not found: {script_id}")
    return DaemonResponse(ok=True, result=_script_detail(script, home=base))


def handle_script_create(args: Dict[str, Any]) -> DaemonResponse:
    base = ensure_home()
    try:
        script = create_script(
            name=args.get("name"),
            kind=args.get("kind"),
            command=args.get("command"),
            cwd=args.get("cwd"),
            env=args.get("env"),
            home=base,
        )
    except ValueError as exc:
        return _error("invalid_request", str(exc))
    return DaemonResponse(ok=True, result=_script_detail(script, home=base))


def handle_script_update(args: Dict[str, Any]) -> DaemonResponse:
    script_id = _require_script_id(args)
    if not script_id:
        return _error("missing_script_id", "missing script_id")
    base = ensure_home()
    try:
        script = update_script(
            script_id,
            name=args.get("name"),
            kind=args.get("kind"),
            command=args.get("command"),
            cwd=args.get("cwd"),
            env=args.get("env"),
            home=base,
        )
    except ValueError as exc:
        return _error("invalid_request", str(exc))
    if script is None:
        return _error("script_not_found", f"script not found: {script_id}")
    return DaemonResponse(ok=True, result=_script_detail(script, home=base))


def handle_script_delete(args: Dict[str, Any]) -> DaemonResponse:
    script_id = _require_script_id(args)
    if not script_id:
        return _error("missing_script_id", "missing script_id")
    base = ensure_home()
    if get_script(script_id, home=base) is None:
        return _error("script_not_found", f"script not found: {script_id}")
    SCRIPT_RUNTIME.remove(script_id, home=base)
    delete_script(script_id, home=base)
    return DaemonResponse(ok=True, result={"script_id": script_id, "deleted": True})


def handle_script_run(args: Dict[str, Any]) -> DaemonResponse:
    script_id = _require_script_id(args)
    if not script_id:
        return _error("missing_script_id", "missing script_id")
    base = ensure_home()
    script = get_script(script_id, home=base)
    if script is None:
        return _error("script_not_found", f"script not found: {script_id}")
    try:
        runtime = SCRIPT_RUNTIME.run(script, home=base)
    except ScriptRuntimeError as exc:
        return _error(exc.code, exc.message)
    return DaemonResponse(
        ok=True,
        result={
            "script": script,
            "runtime": runtime,
            "last_output": load_last_output(script_id, home=base),
        },
    )


def handle_script_stop(args: Dict[str, Any]) -> DaemonResponse:
    script_id = _require_script_id(args)
    if not script_id:
        return _error("missing_script_id", "missing script_id")
    base = ensure_home()
    script = get_script(script_id, home=base)
    if script is None:
        return _error("script_not_found", f"script not found: {script_id}")
    runtime = SCRIPT_RUNTIME.stop(script_id, home=base)
    return DaemonResponse(
        ok=True,
        result={
            "script": script,
            "runtime": runtime,
            "last_output": load_last_output(script_id, home=base),
        },
    )


def handle_script_restart(args: Dict[str, Any]) -> DaemonResponse:
    script_id = _require_script_id(args)
    if not script_id:
        return _error("missing_script_id", "missing script_id")
    base = ensure_home()
    script = get_script(script_id, home=base)
    if script is None:
        return _error("script_not_found", f"script not found: {script_id}")
    try:
        runtime = SCRIPT_RUNTIME.restart(script, home=base)
    except ScriptRuntimeError as exc:
        return _error(exc.code, exc.message)
    return DaemonResponse(
        ok=True,
        result={
            "script": script,
            "runtime": runtime,
            "last_output": load_last_output(script_id, home=base),
        },
    )


def handle_script_attach(args: Dict[str, Any]) -> DaemonResponse:
    script_id = _require_script_id(args)
    if not script_id:
        return _error("missing_script_id", "missing script_id")
    base = ensure_home()
    script = get_script(script_id, home=base)
    if script is None:
        return _error("script_not_found", f"script not found: {script_id}")
    result = SCRIPT_RUNTIME.attach(script_id, home=base)
    return DaemonResponse(ok=True, result=result)


def try_handle_script_op(op: str, args: Dict[str, Any]) -> Optional[DaemonResponse]:
    if op == "script_list":
        return handle_script_list(args)
    if op == "script_get":
        return handle_script_get(args)
    if op == "script_create":
        return handle_script_create(args)
    if op == "script_update":
        return handle_script_update(args)
    if op == "script_delete":
        return handle_script_delete(args)
    if op == "script_run":
        return handle_script_run(args)
    if op == "script_stop":
        return handle_script_stop(args)
    if op == "script_restart":
        return handle_script_restart(args)
    if op == "script_attach":
        return handle_script_attach(args)
    return None
