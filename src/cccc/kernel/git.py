from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any, Optional


def _run_git(args: list[str], *, cwd: Path, strip_output: bool = True) -> tuple[int, str]:
    try:
        p = subprocess.run(
            ["git", *args],
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
        out = p.stdout or ""
        return int(p.returncode), out.strip() if strip_output else out
    except Exception:
        return 1, ""


def git_root(path: Path) -> Optional[Path]:
    code, out = _run_git(["rev-parse", "--show-toplevel"], cwd=path)
    if code != 0 or not out:
        return None
    try:
        return Path(out).resolve()
    except Exception:
        return None


def git_origin_url(repo_root: Path) -> str:
    code, out = _run_git(["config", "--get", "remote.origin.url"], cwd=repo_root)
    return out if code == 0 else ""


def git_status_porcelain(repo_root: Path) -> tuple[int, str]:
    return _run_git(["status", "--porcelain=v1", "-z"], cwd=repo_root, strip_output=False)


def git_diff(repo_root: Path, rel_path: str = "") -> tuple[int, str]:
    args = ["diff", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/"]
    path_text = str(rel_path or "").strip().replace("\\", "/")
    if path_text:
        args.extend(["--", path_text])
    return _run_git(args, cwd=repo_root)


def parse_git_status_porcelain_z(raw: str) -> list[dict[str, Any]]:
    parts = str(raw or "").split("\0")
    items: list[dict[str, Any]] = []
    index = 0
    while index < len(parts):
        entry = parts[index]
        index += 1
        if not entry or len(entry) < 3:
            continue
        index_status = entry[0]
        worktree_status = entry[1]
        path = entry[3:].replace("\\", "/")
        old_path = ""
        if index_status in {"R", "C"} or worktree_status in {"R", "C"}:
            if index < len(parts):
                old_path = parts[index].replace("\\", "/")
                index += 1
        item: dict[str, Any] = {
            "path": path,
            "index": index_status,
            "worktree": worktree_status,
            "status": _status_name(index_status, worktree_status),
        }
        if old_path:
            item["old_path"] = old_path
        items.append(item)
    return items


def _status_name(index_status: str, worktree_status: str) -> str:
    pair = f"{index_status}{worktree_status}"
    if pair == "??":
        return "untracked"
    if "U" in pair or pair in {"AA", "DD"}:
        return "conflicted"
    if "R" in pair:
        return "renamed"
    if "A" in pair:
        return "added"
    if "D" in pair:
        return "deleted"
    if "M" in pair or "T" in pair:
        return "modified"
    return "changed"


_SSH_SCPLIKE = re.compile(r"^(?P<user>[^@]+)@(?P<host>[^:]+):(?P<path>.+)$")


def normalize_git_remote(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return ""
    m = _SSH_SCPLIKE.match(u)
    if m:
        host = m.group("host")
        path = m.group("path")
        if path.endswith(".git"):
            path = path[: -len(".git")]
        return f"https://{host}/{path}"
    if u.startswith("ssh://"):
        u2 = u[len("ssh://") :]
        u2 = u2.replace("git@", "", 1)
        if "/" in u2:
            host, path = u2.split("/", 1)
            if path.endswith(".git"):
                path = path[: -len(".git")]
            return f"https://{host}/{path}"
    if u.startswith("http://") or u.startswith("https://"):
        if u.endswith(".git"):
            u = u[: -len(".git")]
        return u
    return u
