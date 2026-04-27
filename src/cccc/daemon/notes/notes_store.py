from __future__ import annotations

import threading
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from ...paths import ensure_home
from ...util.fs import atomic_write_json, read_json
from ...util.time import utc_now_iso

SCRATCHPAD_NOTE_ID = "scratchpad"
SCRATCHPAD_NOTE_TITLE = "Scratchpad"
_STORE_LOCK = threading.Lock()


def notes_root(*, home: Optional[Path] = None) -> Path:
    return (home or ensure_home()) / "state" / "notes"


def notes_state_path(*, home: Optional[Path] = None) -> Path:
    return notes_root(home=home) / "notes.json"


def _is_scratchpad(note_id: Any, kind: Any = None) -> bool:
    return str(note_id or "").strip() == SCRATCHPAD_NOTE_ID or str(kind or "").strip() == "scratchpad"


def _normalize_note(raw: Any, *, now: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    current = now or utc_now_iso()
    raw_id = str(raw.get("id") or "").strip()
    scratchpad = _is_scratchpad(raw_id, raw.get("kind"))
    note_id = SCRATCHPAD_NOTE_ID if scratchpad else raw_id
    if not note_id:
        return None
    kind = "scratchpad" if scratchpad else "note"
    return {
        "id": note_id,
        "kind": kind,
        "title": SCRATCHPAD_NOTE_TITLE if scratchpad else str(raw.get("title") or ""),
        "body": str(raw.get("body") or ""),
        "created_at": str(raw.get("created_at") or raw.get("createdAt") or current),
        "updated_at": str(raw.get("updated_at") or raw.get("updatedAt") or current),
    }


def _scratchpad(now: Optional[str] = None) -> Dict[str, Any]:
    current = now or utc_now_iso()
    return {
        "id": SCRATCHPAD_NOTE_ID,
        "kind": "scratchpad",
        "title": SCRATCHPAD_NOTE_TITLE,
        "body": "",
        "created_at": current,
        "updated_at": current,
    }


def _order_notes(notes: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    scratchpads = [note for note in notes if note.get("id") == SCRATCHPAD_NOTE_ID]
    others = [note for note in notes if note.get("id") != SCRATCHPAD_NOTE_ID]
    others.sort(key=lambda item: (str(item.get("updated_at") or ""), str(item.get("id") or "")), reverse=True)
    return (scratchpads[:1] or [_scratchpad()]) + others


def _normalize_snapshot(raw: Any) -> Dict[str, Any]:
    now = utc_now_iso()
    source = raw if isinstance(raw, dict) else {}
    values = source.get("notes") if isinstance(source.get("notes"), list) else []
    by_id: Dict[str, Dict[str, Any]] = {}
    for item in values:
        note = _normalize_note(item, now=now)
        if not note:
            continue
        existing = by_id.get(note["id"])
        if existing is None or str(note.get("updated_at") or "") >= str(existing.get("updated_at") or ""):
            by_id[note["id"]] = note
    if SCRATCHPAD_NOTE_ID not in by_id:
        by_id[SCRATCHPAD_NOTE_ID] = _scratchpad(now)
    notes = _order_notes(list(by_id.values()))
    selected = str(source.get("selected_note_id") or source.get("selectedNoteId") or "").strip()
    if not selected or not any(note["id"] == selected for note in notes):
        selected = SCRATCHPAD_NOTE_ID
    return {"version": 1, "notes": notes, "selected_note_id": selected}


def _load_unlocked(*, home: Optional[Path] = None) -> Dict[str, Any]:
    return _normalize_snapshot(read_json(notes_state_path(home=home)))


def _write_unlocked(snapshot: Dict[str, Any], *, home: Optional[Path] = None) -> Dict[str, Any]:
    normalized = _normalize_snapshot(snapshot)
    atomic_write_json(notes_state_path(home=home), normalized)
    return normalized


def list_notes(*, home: Optional[Path] = None) -> Dict[str, Any]:
    with _STORE_LOCK:
        return _load_unlocked(home=home)


def create_note(*, title: Any = "", body: Any = "", home: Optional[Path] = None) -> Dict[str, Any]:
    now = utc_now_iso()
    note = {
        "id": f"note-{uuid.uuid4().hex[:12]}",
        "kind": "note",
        "title": str(title or ""),
        "body": str(body or ""),
        "created_at": now,
        "updated_at": now,
    }
    with _STORE_LOCK:
        snapshot = _load_unlocked(home=home)
        snapshot["notes"] = list(snapshot["notes"]) + [note]
        snapshot["selected_note_id"] = note["id"]
        _write_unlocked(snapshot, home=home)
    return note


def update_note(note_id: str, patch: Dict[str, Any], *, home: Optional[Path] = None) -> Dict[str, Any]:
    target = str(note_id or "").strip()
    if not target:
        raise ValueError("note_id is required")
    now = utc_now_iso()
    with _STORE_LOCK:
        snapshot = _load_unlocked(home=home)
        notes = list(snapshot["notes"])
        for idx, note in enumerate(notes):
            if note.get("id") != target:
                continue
            updated = dict(note)
            if target != SCRATCHPAD_NOTE_ID and "title" in patch:
                updated["title"] = str(patch.get("title") or "")
            if "body" in patch:
                updated["body"] = str(patch.get("body") or "")
            updated["kind"] = "scratchpad" if target == SCRATCHPAD_NOTE_ID else "note"
            if target == SCRATCHPAD_NOTE_ID:
                updated["title"] = SCRATCHPAD_NOTE_TITLE
            updated["updated_at"] = now
            notes[idx] = updated
            snapshot["notes"] = notes
            _write_unlocked(snapshot, home=home)
            return updated
        raise KeyError(target)


def delete_note(note_id: str, *, home: Optional[Path] = None) -> bool:
    target = str(note_id or "").strip()
    if not target or target == SCRATCHPAD_NOTE_ID:
        return False
    with _STORE_LOCK:
        snapshot = _load_unlocked(home=home)
        kept = [note for note in snapshot["notes"] if note.get("id") != target]
        if len(kept) == len(snapshot["notes"]):
            return False
        snapshot["notes"] = kept
        if snapshot.get("selected_note_id") == target:
            snapshot["selected_note_id"] = SCRATCHPAD_NOTE_ID
        _write_unlocked(snapshot, home=home)
        return True


def _has_user_content(snapshot: Dict[str, Any]) -> bool:
    for note in snapshot.get("notes") if isinstance(snapshot.get("notes"), list) else []:
        body = str(note.get("body") or "").strip() if isinstance(note, dict) else ""
        title = str(note.get("title") or "").strip() if isinstance(note, dict) else ""
        if note.get("id") == SCRATCHPAD_NOTE_ID:
            if body:
                return True
            continue
        if title or body:
            return True
    return False


def import_notes(raw_snapshot: Dict[str, Any], *, home: Optional[Path] = None) -> Dict[str, Any]:
    incoming = _normalize_snapshot(raw_snapshot)
    with _STORE_LOCK:
        current = _load_unlocked(home=home)
        if _has_user_content(current):
            return current
        return _write_unlocked(incoming, home=home)
