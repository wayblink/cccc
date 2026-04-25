from __future__ import annotations

import hashlib
import mimetypes
import re
from pathlib import Path
from typing import Any, Dict, Optional

from ..util.fs import atomic_write_bytes
from .group import Group


_SAFE_NAME_RE = re.compile(r"[^a-zA-Z0-9._-]+")
MAX_TEXT_ATTACHMENT_BYTES = 1024 * 1024
_TEXT_ATTACHMENT_EXTENSIONS = {
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".log",
    ".csv",
    ".tsv",
    ".xml",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".env",
    ".sql",
}
_TEXT_ATTACHMENT_MIME_TYPES = {
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    "application/json",
    "application/ld+json",
    "application/xml",
    "application/yaml",
    "application/x-yaml",
    "application/toml",
    "application/x-sh",
    "application/javascript",
    "application/x-javascript",
    "application/typescript",
    "application/x-typescript",
}
_TEXT_ATTACHMENT_MIME_SUFFIXES = ("+json", "+xml", "+yaml")


def blobs_dir(group: Group) -> Path:
    return group.path / "state" / "blobs"


def sanitize_filename(name: str, *, fallback: str = "file") -> str:
    raw = str(name or "").strip()
    if not raw:
        return fallback
    # Drop any directory parts (defense-in-depth).
    raw = raw.replace("\\", "/").split("/")[-1].strip()
    if not raw:
        return fallback
    # Replace weird chars with "_".
    cleaned = _SAFE_NAME_RE.sub("_", raw).strip()
    if not cleaned:
        return fallback

    # If the name is effectively "just an extension" after sanitization
    # (common when the original basename is non-ASCII), prefix a fallback stem.
    p = Path(cleaned)
    suffix = p.suffix  # includes "."
    stem = p.stem
    stem_meaningful = re.sub(r"[._-]+", "", stem)
    if suffix and not stem_meaningful:
        cleaned = f"{fallback}{suffix}"

    # Avoid returning filenames that are only punctuation/underscores.
    if not re.search(r"[a-zA-Z0-9]", cleaned):
        return fallback

    # Cap length to keep paths reasonable.
    if len(cleaned) > 120:
        cleaned = cleaned[:120]
    return cleaned


def _detect_kind(mime_type: str, filename: str) -> str:
    mt = str(mime_type or "").strip().lower()
    if mt.startswith("image/"):
        return "image"
    _ = filename
    return "file"


def normalize_text_attachment_mime_type(filename: str, mime_type: str = "") -> str:
    normalized = str(mime_type or "").strip().lower()
    if normalized:
        return normalized
    guessed, _ = mimetypes.guess_type(str(filename or "").strip())
    return str(guessed or "").strip().lower()


def is_text_attachment_metadata(*, filename: str, mime_type: str = "") -> bool:
    normalized_mime_type = normalize_text_attachment_mime_type(filename, mime_type)
    if normalized_mime_type.startswith("text/"):
        return True
    if normalized_mime_type in _TEXT_ATTACHMENT_MIME_TYPES:
        return True
    if any(normalized_mime_type.endswith(suffix) for suffix in _TEXT_ATTACHMENT_MIME_SUFFIXES):
        return True
    return Path(str(filename or "").strip()).suffix.lower() in _TEXT_ATTACHMENT_EXTENSIONS


def decode_text_attachment_bytes(*, data: bytes, filename: str, mime_type: str = "") -> str:
    raw = data or b""
    if len(raw) > MAX_TEXT_ATTACHMENT_BYTES:
        raise ValueError("attachment_too_large")
    if b"\x00" in raw:
        raise ValueError("unsupported_attachment")
    if not is_text_attachment_metadata(filename=filename, mime_type=mime_type):
        raise ValueError("unsupported_attachment")
    try:
        return raw.decode("utf-8", errors="replace")
    except Exception as exc:
        raise ValueError("unsupported_attachment") from exc


def store_blob_bytes(
    group: Group,
    *,
    data: bytes,
    filename: str,
    mime_type: str = "",
    kind: Optional[str] = None,
) -> Dict[str, Any]:
    b = data or b""
    sha256 = hashlib.sha256(b).hexdigest()
    safe_name = sanitize_filename(filename)
    blob_name = f"{sha256}_{safe_name}"

    rel = Path("state") / "blobs" / blob_name
    abs_path = group.path / rel

    try:
        if not abs_path.exists():
            atomic_write_bytes(abs_path, b)
    except Exception:
        # If we fail to write, let caller handle via exception.
        raise

    if kind is None:
        kind = _detect_kind(mime_type, safe_name)

    return {
        "kind": str(kind),
        "path": str(rel),
        "title": safe_name,
        "mime_type": str(mime_type or ""),
        "bytes": len(b),
        "sha256": sha256,
    }


def resolve_blob_attachment_path(group: Group, *, rel_path: str) -> Path:
    """Resolve an attachment path to an absolute blob path (only under state/blobs/)."""
    rp = Path(str(rel_path or "").strip())
    if not rp or rp.is_absolute():
        raise ValueError("invalid attachment path")
    if ".." in rp.parts:
        raise ValueError("invalid attachment path")
    # Only allow our blob store.
    if len(rp.parts) < 3 or rp.parts[0] != "state" or rp.parts[1] != "blobs":
        raise ValueError("attachment is not a blob")
    abs_path = (group.path / rp).resolve()
    base = group.path.resolve()
    try:
        abs_path.relative_to(base)
    except Exception:
        raise ValueError("invalid attachment path")
    return abs_path
