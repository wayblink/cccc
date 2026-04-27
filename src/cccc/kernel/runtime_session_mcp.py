"""Session-scoped MCP injection for actor runtime commands."""
from __future__ import annotations

import json
from typing import List

from .runtime import get_cccc_mcp_stdio_command


def session_scoped_mcp_supported(runtime: str) -> bool:
    return str(runtime or "").strip().lower() in {"codex", "claude"}


def _toml_string(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=True)


def _toml_array(values: List[str]) -> str:
    return "[" + ",".join(_toml_string(value) for value in values) + "]"


def _strip_codex_mcp_overrides(command: List[str]) -> List[str]:
    strip_keys = {
        "mcp_servers.cccc.command",
        "mcp_servers.cccc.args",
    }
    if not command:
        return []
    out: List[str] = [command[0]]
    index = 1
    while index < len(command):
        token = str(command[index] or "")
        if token == "-c" and index + 1 < len(command):
            value = str(command[index + 1] or "")
            key = value.split("=", 1)[0].strip() if value else ""
            if key in strip_keys:
                index += 2
                continue
            out.extend([token, value])
            index += 2
            continue
        out.append(token)
        index += 1
    return out


def _inject_codex(command: List[str], mcp_cmd: List[str]) -> List[str]:
    base = _strip_codex_mcp_overrides(command)
    if not base:
        return []
    server_command = mcp_cmd[0]
    server_args = mcp_cmd[1:]
    injected = [
        base[0],
        "-c",
        f"mcp_servers.cccc.command={_toml_string(server_command)}",
        "-c",
        f"mcp_servers.cccc.args={_toml_array(server_args)}",
    ]
    injected.extend(base[1:])
    return injected


def _strip_claude_mcp_flags(command: List[str]) -> List[str]:
    out: List[str] = []
    index = 0
    while index < len(command):
        token = str(command[index] or "")
        if token == "--mcp-config" and index + 1 < len(command):
            index += 2
            continue
        if token == "--strict-mcp-config":
            index += 1
            continue
        out.append(token)
        index += 1
    return out


def _inject_claude(command: List[str], mcp_cmd: List[str]) -> List[str]:
    base = _strip_claude_mcp_flags(command)
    if not base:
        return []
    config = {
        "mcpServers": {
            "cccc": {
                "command": mcp_cmd[0],
                "args": mcp_cmd[1:],
            }
        }
    }
    return [base[0], "--mcp-config", json.dumps(config, ensure_ascii=False, separators=(",", ":")), "--strict-mcp-config", *base[1:]]


def inject_session_scoped_mcp(runtime: str, command: List[str]) -> List[str]:
    """Return argv with CCCC MCP configured only for this launched session.

    The function intentionally does not mutate any user/global MCP config. It only
    adds command-line configuration supported by the runtime being launched.
    """
    rt = str(runtime or "").strip().lower()
    cmd = [str(item) for item in (command or []) if str(item).strip()]
    if not cmd:
        return []
    if rt not in {"codex", "claude"}:
        return cmd
    mcp_cmd = [str(item) for item in get_cccc_mcp_stdio_command() if str(item).strip()]
    if not mcp_cmd:
        return cmd
    if rt == "codex":
        return _inject_codex(cmd, mcp_cmd)
    if rt == "claude":
        return _inject_claude(cmd, mcp_cmd)
    return cmd
