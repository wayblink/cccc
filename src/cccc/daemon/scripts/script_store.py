from __future__ import annotations

from pathlib import Path
import threading
import uuid
from typing import Any, Dict, List, Optional

from ...paths import ensure_home
from ...util.fs import atomic_write_json, read_json
from ...util.time import utc_now_iso

_STORE_LOCK = threading.Lock()


def _scripts_root(*, home: Optional[Path] = None) -> Path:
    base = home or ensure_home()
    return base / "state" / "scripts"


def _scripts_path(*, home: Optional[Path] = None) -> Path:
    return _scripts_root(home=home) / "scripts.json"


def _last_outputs_dir(*, home: Optional[Path] = None) -> Path:
    return _scripts_root(home=home) / "last_outputs"


def _last_output_path(script_id: str, *, home: Optional[Path] = None) -> Path:
    return _last_outputs_dir(home=home) / f"{script_id}.json"


def _normalize_env(raw: Any) -> Dict[str, str]:
    if not isinstance(raw, dict):
        return {}
    out: Dict[str, str] = {}
    for key, value in raw.items():
        name = str(key or "").strip()
        if not name:
            continue
        out[name] = str(value if value is not None else "")
    return out


def _normalize_script(raw: Any) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    now = utc_now_iso()
    kind = str(raw.get("kind") or "service").strip().lower()
    if kind not in {"service", "task"}:
        kind = "service"
    return {
        "id": str(raw.get("id") or "").strip(),
        "name": str(raw.get("name") or "").strip(),
        "kind": kind,
        "command": str(raw.get("command") or "").strip(),
        "cwd": str(raw.get("cwd") or "."),
        "env": _normalize_env(raw.get("env")),
        "created_at": str(raw.get("created_at") or now),
        "updated_at": str(raw.get("updated_at") or now),
    }


def _load_scripts_unlocked(*, home: Optional[Path] = None) -> List[Dict[str, Any]]:
    payload = read_json(_scripts_path(home=home))
    items = payload.get("scripts") if isinstance(payload, dict) else None
    if not isinstance(items, list):
        return []
    out: List[Dict[str, Any]] = []
    for item in items:
        script = _normalize_script(item)
        if script.get("id"):
            out.append(script)
    return out


def _write_scripts_unlocked(items: List[Dict[str, Any]], *, home: Optional[Path] = None) -> None:
    normalized = [_normalize_script(item) for item in items if isinstance(item, dict)]
    atomic_write_json(_scripts_path(home=home), {"scripts": normalized})


def list_scripts(*, home: Optional[Path] = None) -> List[Dict[str, Any]]:
    with _STORE_LOCK:
        return _load_scripts_unlocked(home=home)


def get_script(script_id: str, *, home: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    target = str(script_id or "").strip()
    if not target:
        return None
    with _STORE_LOCK:
        for item in _load_scripts_unlocked(home=home):
            if str(item.get("id") or "") == target:
                return item
    return None


def _normalize_kind(raw: Any) -> str:
    kind = str(raw or "service").strip().lower()
    return kind if kind in {"service", "task"} else "service"


def create_script(*, name: Any, kind: Any, command: Any, cwd: Any, env: Any, home: Optional[Path] = None) -> Dict[str, Any]:
    script_name = str(name or "").strip()
    script_command = str(command or "").strip()
    script_cwd = str(cwd or ".")
    if not script_name:
        raise ValueError("name is required")
    if not script_command:
        raise ValueError("command is required")
    now = utc_now_iso()
    item = {
        "id": uuid.uuid4().hex,
        "name": script_name,
        "kind": _normalize_kind(kind),
        "command": script_command,
        "cwd": script_cwd,
        "env": _normalize_env(env),
        "created_at": now,
        "updated_at": now,
    }
    with _STORE_LOCK:
        items = _load_scripts_unlocked(home=home)
        items.append(item)
        _write_scripts_unlocked(items, home=home)
    return item


def update_script(
    script_id: str,
    *,
    name: Any,
    kind: Any,
    command: Any,
    cwd: Any,
    env: Any,
    home: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    target = str(script_id or "").strip()
    if not target:
        return None
    script_name = str(name or "").strip()
    script_command = str(command or "").strip()
    script_cwd = str(cwd or ".")
    if not script_name:
        raise ValueError("name is required")
    if not script_command:
        raise ValueError("command is required")
    with _STORE_LOCK:
        items = _load_scripts_unlocked(home=home)
        for idx, item in enumerate(items):
            if str(item.get("id") or "") != target:
                continue
            updated = dict(item)
            updated.update(
                {
                    "name": script_name,
                    "kind": _normalize_kind(kind),
                    "command": script_command,
                    "cwd": script_cwd,
                    "env": _normalize_env(env),
                    "updated_at": utc_now_iso(),
                }
            )
            items[idx] = updated
            _write_scripts_unlocked(items, home=home)
            return _normalize_script(updated)
    return None


def delete_script(script_id: str, *, home: Optional[Path] = None) -> bool:
    target = str(script_id or "").strip()
    if not target:
        return False
    removed = False
    with _STORE_LOCK:
        items = _load_scripts_unlocked(home=home)
        kept = [item for item in items if str(item.get("id") or "") != target]
        removed = len(kept) != len(items)
        if removed:
            _write_scripts_unlocked(kept, home=home)
    if removed:
        try:
            _last_output_path(target, home=home).unlink()
        except FileNotFoundError:
            pass
        except Exception:
            pass
    return removed


def load_last_output(script_id: str, *, home: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    target = str(script_id or "").strip()
    if not target:
        return None
    payload = read_json(_last_output_path(target, home=home))
    if not isinstance(payload, dict) or not payload:
        return None
    return dict(payload)


def write_last_output(script_id: str, output: Dict[str, Any], *, home: Optional[Path] = None) -> None:
    target = str(script_id or "").strip()
    if not target:
        return
    payload = dict(output or {})
    payload["script_id"] = target
    atomic_write_json(_last_output_path(target, home=home), payload)
