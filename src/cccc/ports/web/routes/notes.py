from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ....daemon.notes.notes_store import (
    SCRATCHPAD_NOTE_ID,
    create_note,
    delete_note,
    import_notes,
    list_notes,
    update_note,
)
from ..schemas import RouteContext, require_user


class NoteCreateRequest(BaseModel):
    title: Any = ""
    body: Any = ""


class NoteUpdateRequest(BaseModel):
    title: Any = None
    body: Any = None


class NoteImportRequest(BaseModel):
    notes: list[dict[str, Any]] = []
    selected_note_id: Any = None
    selectedNoteId: Any = None
    version: Any = None


def create_routers(ctx: RouteContext) -> list[APIRouter]:
    router = APIRouter(prefix="/api/v1/user/notes", dependencies=[Depends(require_user)])

    def _ensure_writable() -> None:
        if ctx.read_only:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "read_only",
                    "message": "Notes write endpoints are disabled in read-only (exhibit) mode.",
                },
            )

    def _snapshot_result() -> Dict[str, Any]:
        return {"ok": True, "result": {"snapshot": list_notes(home=ctx.home)}}

    @router.get("")
    async def notes_list() -> Dict[str, Any]:
        return _snapshot_result()

    @router.post("")
    async def notes_create(req: NoteCreateRequest) -> Dict[str, Any]:
        _ensure_writable()
        note = create_note(title=req.title, body=req.body, home=ctx.home)
        return {"ok": True, "result": {"note": note, "snapshot": list_notes(home=ctx.home)}}

    @router.patch("/{note_id}")
    async def notes_update(note_id: str, req: NoteUpdateRequest) -> Dict[str, Any]:
        _ensure_writable()
        patch: Dict[str, Any] = {}
        if req.title is not None:
            patch["title"] = req.title
        if req.body is not None:
            patch["body"] = req.body
        try:
            note = update_note(note_id, patch, home=ctx.home)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail={"code": "note_not_found", "message": "note not found"}) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"code": "invalid_note", "message": str(exc)}) from exc
        return {"ok": True, "result": {"note": note, "snapshot": list_notes(home=ctx.home)}}

    @router.delete("/{note_id}")
    async def notes_delete(note_id: str) -> Dict[str, Any]:
        _ensure_writable()
        if str(note_id or "").strip() == SCRATCHPAD_NOTE_ID:
            raise HTTPException(
                status_code=400,
                detail={"code": "scratchpad_not_deletable", "message": "scratchpad cannot be deleted"},
            )
        if not delete_note(note_id, home=ctx.home):
            raise HTTPException(status_code=404, detail={"code": "note_not_found", "message": "note not found"})
        return _snapshot_result()

    @router.post("/import")
    async def notes_import(req: NoteImportRequest) -> Dict[str, Any]:
        _ensure_writable()
        snapshot = import_notes(req.model_dump(), home=ctx.home)
        return {"ok": True, "result": {"snapshot": snapshot}}

    return [router]
