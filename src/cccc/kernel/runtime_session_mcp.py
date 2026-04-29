"""Session-scoped MCP injection for actor runtime commands."""
from __future__ import annotations

import json
import os
from typing import Any, List, Mapping

from .runtime import get_cccc_mcp_stdio_command


def session_scoped_mcp_supported(runtime: str) -> bool:
    return str(runtime or "").strip().lower() in {"codex", "claude", "copilot"}


def _toml_string(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=True)


def _toml_array(values: List[str]) -> str:
    return "[" + ",".join(_toml_string(value) for value in values) + "]"


def _toml_inline_table(values: Mapping[str, str]) -> str:
    pairs = [f"{key}={_toml_string(values[key])}" for key in sorted(values)]
    return "{" + ",".join(pairs) + "}"


def _cccc_mcp_env(env: Mapping[str, Any] | None = None) -> dict[str, str]:
    source: Mapping[str, Any] = env if env is not None else os.environ
    out: dict[str, str] = {}
    for key in ("CCCC_HOME", "CCCC_GROUP_ID", "CCCC_ACTOR_ID", "CCCC_WEB_PORT"):
        value = str(source.get(key) or "").strip()
        if value:
            out[key] = value
    return out


def _strip_codex_mcp_overrides(command: List[str]) -> List[str]:
    strip_keys = {
        "mcp_servers.cccc.command",
        "mcp_servers.cccc.args",
        "mcp_servers.cccc.env",
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


def _inject_codex(command: List[str], mcp_cmd: List[str], env: Mapping[str, Any] | None = None) -> List[str]:
    base = _strip_codex_mcp_overrides(command)
    if not base:
        return []
    server_command = mcp_cmd[0]
    server_args = mcp_cmd[1:]
    server_env = _cccc_mcp_env(env)
    injected = [
        base[0],
        "-c",
        f"mcp_servers.cccc.command={_toml_string(server_command)}",
        "-c",
        f"mcp_servers.cccc.args={_toml_array(server_args)}",
    ]
    if server_env:
        injected.extend(["-c", f"mcp_servers.cccc.env={_toml_inline_table(server_env)}"])
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


def _strip_copilot_mcp_flags(command: List[str]) -> List[str]:
    out: List[str] = []
    index = 0
    while index < len(command):
        token = str(command[index] or "")
        if token == "--additional-mcp-config" and index + 1 < len(command):
            index += 2
            continue
        out.append(token)
        index += 1
    return out


def _inject_copilot(command: List[str], mcp_cmd: List[str]) -> List[str]:
    base = _strip_copilot_mcp_flags(command)
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
    return [base[0], "--additional-mcp-config", json.dumps(config, ensure_ascii=False, separators=(",", ":")), *base[1:]]


def inject_session_scoped_mcp(runtime: str, command: List[str], env: Mapping[str, Any] | None = None) -> List[str]:
    """Return argv with CCCC MCP configured only for this launched session.

    The function intentionally does not mutate any user/global MCP config. It only
    adds command-line configuration supported by the runtime being launched.
    """
    rt = str(runtime or "").strip().lower()
    cmd = [str(item) for item in (command or []) if str(item).strip()]
    if not cmd:
        return []
    if rt not in {"codex", "claude", "copilot"}:
        return cmd
    mcp_cmd = [str(item) for item in get_cccc_mcp_stdio_command() if str(item).strip()]
    if not mcp_cmd:
        return cmd
    if rt == "codex":
        return _inject_codex(cmd, mcp_cmd, env=env)
    if rt == "claude":
        return _inject_claude(cmd, mcp_cmd)
    if rt == "copilot":
        return _inject_copilot(cmd, mcp_cmd)
    return cmd
