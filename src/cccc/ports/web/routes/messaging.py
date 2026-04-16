from __future__ import annotations

import json
import mimetypes
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from ....kernel.blobs import (
    MAX_TEXT_ATTACHMENT_BYTES,
    decode_text_attachment_bytes,
    normalize_text_attachment_mime_type,
    resolve_blob_attachment_path,
    sanitize_filename,
    store_blob_bytes,
)
from ....kernel.group import load_group
from ..schemas import (
    ReplyRequest,
    RouteContext,
    SaveTextAttachmentRequest,
    SendCrossGroupRequest,
    SendRequest,
    UserAckRequest,
    WEB_MAX_FILE_BYTES,
    WEB_MAX_FILE_MB,
    _normalize_reply_required,
    check_group,
    require_group,
)

def create_routers(ctx: RouteContext) -> list[APIRouter]:
    group_router = APIRouter(prefix="/api/v1/groups/{group_id}", dependencies=[Depends(require_group)])

    def _parse_refs_json(raw: str) -> list[dict[str, Any]]:
        text = str(raw or "").strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
        except Exception as exc:
            raise HTTPException(status_code=400, detail={"code": "invalid_refs", "message": str(exc)})
        if not isinstance(parsed, list):
            raise HTTPException(status_code=400, detail={"code": "invalid_refs", "message": "refs_json must be a JSON array"})
        refs: list[dict[str, Any]] = []
        for item in parsed:
            if isinstance(item, dict):
                refs.append(item)
        return refs

    def _parse_attachments_json(raw: str) -> list[dict[str, Any]]:
        text = str(raw or "").strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
        except Exception as exc:
            raise HTTPException(status_code=400, detail={"code": "invalid_attachments", "message": str(exc)})
        if not isinstance(parsed, list):
            raise HTTPException(status_code=400, detail={"code": "invalid_attachments", "message": "attachments_json must be a JSON array"})
        attachments: list[dict[str, Any]] = []
        for item in parsed:
            if isinstance(item, dict):
                attachments.append(item)
        return attachments

    def _normalize_priority(raw: str) -> str:
        prio = str(raw or "normal").strip() or "normal"
        if prio not in ("normal", "attention"):
            raise HTTPException(status_code=400, detail={"code": "invalid_priority", "message": "priority must be 'normal' or 'attention'"})
        return prio

    def _normalize_client_id(raw: str) -> str:
        return str(raw or "").strip()

    def _build_message_request(op: str, *, group_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
        return {"op": op, "args": {"group_id": group_id, **args}}

    async def _submit_message(req: Dict[str, Any]) -> Dict[str, Any]:
        return await ctx.daemon(req)

    async def _store_upload_attachments(group: Any, files: list[UploadFile]) -> list[dict[str, Any]]:
        attachments: list[dict[str, Any]] = []
        for upload in files or []:
            raw = await upload.read()
            if len(raw) > WEB_MAX_FILE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail={"code": "file_too_large", "message": f"file too large (> {WEB_MAX_FILE_MB}MB)"},
                )
            attachments.append(
                store_blob_bytes(
                    group,
                    data=raw,
                    filename=str(getattr(upload, "filename", "") or "file"),
                    mime_type=str(getattr(upload, "content_type", "") or ""),
                )
            )
        return attachments

    def _message_text_for_upload(*, text: str, attachments: list[dict[str, Any]]) -> str:
        msg_text = str(text or "").strip()
        if msg_text or not attachments:
            return msg_text
        if len(attachments) == 1:
            return f"[file] {attachments[0].get('title') or 'file'}"
        return f"[files] {len(attachments)} attachments"

    @group_router.post("/send")
    async def send(group_id: str, req: SendRequest) -> Dict[str, Any]:
        daemon_req = _build_message_request(
            "send",
            group_id=group_id,
            args={
                "text": req.text,
                "by": req.by,
                "to": list(req.to),
                "path": req.path,
                "quote_text": req.quote_text,
                "priority": req.priority,
                "reply_required": _normalize_reply_required(req.reply_required),
                "src_group_id": req.src_group_id,
                "src_event_id": req.src_event_id,
                "client_id": _normalize_client_id(req.client_id),
                "refs": list(req.refs),
                "attachments": list(req.attachments),
            },
        )
        return await _submit_message(daemon_req)

    @group_router.post("/send_cross_group")
    async def send_cross_group(request: Request, group_id: str, req: SendCrossGroupRequest) -> Dict[str, Any]:
        """Send a message to another group with provenance.

        This creates a source chat.message in the current group and forwards a copy into the destination group
        with (src_group_id, src_event_id) set.
        """
        check_group(request, req.dst_group_id)
        return await ctx.daemon(
            {
                "op": "send_cross_group",
                "args": {
                    "group_id": group_id,
                    "dst_group_id": req.dst_group_id,
                    "text": req.text,
                    "by": req.by,
                    "to": list(req.to),
                    "priority": req.priority,
                    "reply_required": _normalize_reply_required(req.reply_required),
                },
            }
        )

    @group_router.post("/reply")
    async def reply(group_id: str, req: ReplyRequest) -> Dict[str, Any]:
        daemon_req = _build_message_request(
            "reply",
            group_id=group_id,
            args={
                "text": req.text,
                "by": req.by,
                "to": list(req.to),
                "reply_to": req.reply_to,
                "priority": req.priority,
                "reply_required": _normalize_reply_required(req.reply_required),
                "client_id": _normalize_client_id(req.client_id),
                "refs": list(req.refs),
                "attachments": list(req.attachments),
            },
        )
        return await _submit_message(daemon_req)

    @group_router.post("/events/{event_id}/ack")
    async def chat_ack(group_id: str, event_id: str, req: UserAckRequest) -> Dict[str, Any]:
        # Web UI can only ACK as user (no impersonation).
        if str(req.by or "").strip() != "user":
            raise HTTPException(status_code=403, detail={"code": "permission_denied", "message": "ack is only supported as user in the web UI"})
        return await ctx.daemon(
            {
                "op": "chat_ack",
                "args": {"group_id": group_id, "event_id": event_id, "actor_id": "user", "by": "user"},
            }
        )

    @group_router.post("/send_upload")
    async def send_upload(
        group_id: str,
        by: str = Form("user"),
        text: str = Form(""),
        to_json: str = Form("[]"),
        path: str = Form(""),
        priority: str = Form("normal"),
        reply_required: str = Form("false"),
        client_id: str = Form(""),
        refs_json: str = Form("[]"),
        attachments_json: str = Form("[]"),
        files: list[UploadFile] = File(default_factory=list),
    ) -> Dict[str, Any]:
        group = load_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail={"code": "group_not_found", "message": f"group not found: {group_id}"})

        try:
            parsed_to = json.loads(to_json or "[]")
        except Exception:
            parsed_to = []
        to_list = [str(x).strip() for x in (parsed_to if isinstance(parsed_to, list) else []) if str(x).strip()]

        # Preflight recipients before storing attachments (avoid orphan blobs on invalid/no-op sends).
        from ....kernel.actors import list_visible_actors, resolve_recipient_tokens
        from ....kernel.messaging import get_default_send_to
        try:
            canonical_to = resolve_recipient_tokens(group, to_list)
        except Exception as e:
            raise HTTPException(status_code=400, detail={"code": "invalid_recipient", "message": str(e)})
        if to_list and not canonical_to:
            raise HTTPException(status_code=400, detail={"code": "invalid_recipient", "message": "invalid recipient"})

        raw_text = str(text or "").strip()
        if not canonical_to and not to_list and raw_text:
            import re
            mention_pattern = re.compile(r"@(\w[\w-]*)")
            mentions = mention_pattern.findall(raw_text)
            if mentions:
                actor_ids = {str(a.get("id") or "").strip() for a in list_visible_actors(group) if isinstance(a, dict)}
                mention_tokens: list[str] = []
                for m in mentions:
                    if not m:
                        continue
                    if m in ("all", "peers", "foreman"):
                        mention_tokens.append(f"@{m}")
                    elif m in actor_ids:
                        mention_tokens.append(m)
                if mention_tokens:
                    try:
                        canonical_to = resolve_recipient_tokens(group, mention_tokens)
                    except Exception:
                        canonical_to = []

        if not canonical_to and not to_list and get_default_send_to(group.doc) == "foreman":
            canonical_to = ["@foreman"]

        # Note: enabled-recipient validation + auto-wake is handled by the daemon.

        attachments = _parse_attachments_json(attachments_json)
        attachments.extend(await _store_upload_attachments(group, files))
        msg_text = _message_text_for_upload(text=text, attachments=attachments)
        prio = _normalize_priority(priority)
        refs = _parse_refs_json(refs_json)
        normalized_client_id = _normalize_client_id(client_id)
        daemon_req = _build_message_request(
            "send",
            group_id=group_id,
            args={
                "text": msg_text,
                "by": by,
                "to": canonical_to,
                "path": path,
                "attachments": attachments,
                "priority": prio,
                "reply_required": _normalize_reply_required(reply_required),
                "client_id": normalized_client_id,
                "refs": refs,
            },
        )
        return await _submit_message(daemon_req)

    @group_router.post("/reply_upload")
    async def reply_upload(
        group_id: str,
        by: str = Form("user"),
        text: str = Form(""),
        to_json: str = Form("[]"),
        reply_to: str = Form(""),
        priority: str = Form("normal"),
        reply_required: str = Form("false"),
        client_id: str = Form(""),
        refs_json: str = Form("[]"),
        attachments_json: str = Form("[]"),
        files: list[UploadFile] = File(default_factory=list),
    ) -> Dict[str, Any]:
        group = load_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail={"code": "group_not_found", "message": f"group not found: {group_id}"})

        reply_to_id = str(reply_to or "").strip()
        if not reply_to_id:
            raise HTTPException(status_code=400, detail={"code": "missing_reply_to", "message": "missing reply_to"})

        try:
            parsed_to = json.loads(to_json or "[]")
        except Exception:
            parsed_to = []
        to_list = [str(x).strip() for x in (parsed_to if isinstance(parsed_to, list) else []) if str(x).strip()]

        # Preflight recipients before storing attachments (avoid orphan blobs on invalid/no-op sends).
        from ....kernel.actors import resolve_recipient_tokens
        from ....kernel.inbox import find_event
        from ....kernel.messaging import default_reply_recipients

        original = find_event(group, reply_to_id)
        if original is None:
            raise HTTPException(status_code=404, detail={"code": "event_not_found", "message": f"event not found: {reply_to_id}"})

        try:
            canonical_to = resolve_recipient_tokens(group, to_list)
        except Exception as e:
            raise HTTPException(status_code=400, detail={"code": "invalid_recipient", "message": str(e)})
        if to_list and not canonical_to:
            raise HTTPException(status_code=400, detail={"code": "invalid_recipient", "message": "invalid recipient"})

        if not canonical_to and not to_list:
            canonical_to = resolve_recipient_tokens(group, default_reply_recipients(group, by=by, original_event=original))

        # Note: enabled-recipient validation + auto-wake is handled by the daemon.

        attachments = _parse_attachments_json(attachments_json)
        attachments.extend(await _store_upload_attachments(group, files))
        msg_text = _message_text_for_upload(text=text, attachments=attachments)
        prio = _normalize_priority(priority)
        refs = _parse_refs_json(refs_json)
        normalized_client_id = _normalize_client_id(client_id)
        daemon_req = _build_message_request(
            "reply",
            group_id=group_id,
            args={
                "text": msg_text,
                "by": by,
                "to": canonical_to,
                "reply_to": reply_to_id,
                "attachments": attachments,
                "priority": prio,
                "reply_required": _normalize_reply_required(reply_required),
                "client_id": normalized_client_id,
                "refs": refs,
            },
        )
        return await _submit_message(daemon_req)

    @group_router.get("/attachments/text")
    async def attachment_text_get(group_id: str, path: str) -> Dict[str, Any]:
        group = load_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail={"code": "group_not_found", "message": f"group not found: {group_id}"})

        rel_path = str(path or "").strip()
        try:
            abs_path = resolve_blob_attachment_path(group, rel_path=rel_path)
        except Exception:
            raise HTTPException(status_code=400, detail={"code": "invalid_attachment", "message": "attachment must reference a blob path"})

        if not abs_path.exists() or not abs_path.is_file():
            raise HTTPException(status_code=404, detail={"code": "not_found", "message": "attachment not found"})

        blob_name = abs_path.name
        title = blob_name.split("_", 1)[1] if "_" in blob_name else blob_name
        mime_type = normalize_text_attachment_mime_type(title, mimetypes.guess_type(title)[0] or "")
        raw = abs_path.read_bytes()
        try:
            content = decode_text_attachment_bytes(data=raw, filename=title, mime_type=mime_type)
        except ValueError as exc:
            code = str(exc or "").strip() or "unsupported_attachment"
            if code == "attachment_too_large":
                raise HTTPException(status_code=413, detail={"code": code, "message": f"attachment too large (> {MAX_TEXT_ATTACHMENT_BYTES} bytes)"})
            raise HTTPException(status_code=415, detail={"code": "unsupported_attachment", "message": "attachment is not editable text"})

        return {
            "ok": True,
            "result": {
                "path": rel_path,
                "title": title,
                "mime_type": mime_type,
                "bytes": len(raw),
                "content": content,
            },
        }

    @group_router.post("/attachments/text/save")
    async def attachment_text_save(group_id: str, req: SaveTextAttachmentRequest) -> Dict[str, Any]:
        group = load_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail={"code": "group_not_found", "message": f"group not found: {group_id}"})

        raw_name = str(req.filename or "").strip()
        if not raw_name:
            raise HTTPException(status_code=400, detail={"code": "invalid_filename", "message": "filename is required"})

        safe_name = sanitize_filename(raw_name)
        content = str(req.content or "")
        raw = content.encode("utf-8")
        if len(raw) > MAX_TEXT_ATTACHMENT_BYTES:
            raise HTTPException(status_code=413, detail={"code": "attachment_too_large", "message": f"attachment too large (> {MAX_TEXT_ATTACHMENT_BYTES} bytes)"})

        mime_type = normalize_text_attachment_mime_type(safe_name, req.mime_type or "")
        attachment = store_blob_bytes(group, data=raw, filename=safe_name, mime_type=mime_type or "text/plain")
        return {"ok": True, "result": {"attachment": attachment}}

    @group_router.get("/blobs/{blob_name}")
    async def blob_download(group_id: str, blob_name: str) -> FileResponse:
        group = load_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail={"code": "group_not_found", "message": f"group not found: {group_id}"})
        name = str(blob_name or "").strip()
        if not name or "/" in name or "\\" in name or ".." in name:
            raise HTTPException(status_code=400, detail={"code": "invalid_blob", "message": "invalid blob name"})

        rel = f"state/blobs/{name}"
        try:
            abs_path = resolve_blob_attachment_path(group, rel_path=rel)
        except Exception:
            raise HTTPException(status_code=400, detail={"code": "invalid_blob", "message": "invalid blob name"})

        if not abs_path.exists() or not abs_path.is_file():
            raise HTTPException(status_code=404, detail={"code": "not_found", "message": "blob not found"})

        download_name = name
        if len(name) > 64 and "_" in name:
            # blob name format: <sha256>_<filename>
            download_name = name.split("_", 1)[1] or name
        response = FileResponse(path=abs_path, filename=download_name)
        # Blob names are content-addressed (<sha256>_<filename>), so they are safe to cache aggressively.
        response.headers["Cache-Control"] = "private, max-age=31536000, immutable"
        return response

    return [group_router]
