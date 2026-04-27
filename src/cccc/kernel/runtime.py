"""Runtime detection and configuration for agent CLIs."""
from __future__ import annotations

import os
import ntpath
import re
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..util.process import find_subprocess_executable, resolve_subprocess_argv


@dataclass
class RuntimeInfo:
    """Information about an agent runtime."""
    name: str
    display_name: str
    command: str
    available: bool
    path: Optional[str]
    capabilities: str
    mcp_add_command: Optional[List[str]]  # Command to add MCP server, None if manual config required
    # From runtime pool (if configured)
    priority: int = 999
    scenarios: List[str] = None  # type: ignore
    
    def __post_init__(self) -> None:
        if self.scenarios is None:
            self.scenarios = []


# Known agent runtimes with their configurations
KNOWN_RUNTIMES: Dict[str, Dict[str, Any]] = {
    "amp": {
        "display_name": "Amp",
        "command": "amp",
        "capabilities": "MCP; MCP setup: auto",
        "mcp_add_pattern": "amp mcp add {name} {cmd}",
    },
    "auggie": {
        "display_name": "Auggie (Augment)",
        "command": "auggie",
        "capabilities": "MCP; MCP setup: auto",
        "mcp_add_pattern": "auggie mcp add {name} -- {cmd}",
    },
    "claude": {
        "display_name": "Claude Code",
        "command": "claude",
        "capabilities": "MCP; actor MCP: session-scoped; setup: optional global",
        "mcp_add_pattern": "claude mcp add -s user {name} -- {cmd}",
    },
    "codex": {
        "display_name": "Codex CLI",
        "command": "codex",
        "capabilities": "MCP; actor MCP: session-scoped; setup: optional global",
        "mcp_add_pattern": "codex mcp add {name} -- {cmd}",
    },
    "droid": {
        "display_name": "Droid CLI",
        "command": "droid",
        "capabilities": "MCP; MCP setup: auto",
        "mcp_add_pattern": "droid mcp add --type stdio {name} {cmd}",
    },
    "gemini": {
        "display_name": "Gemini CLI",
        "command": "gemini",
        "capabilities": "MCP; MCP setup: auto",
        "mcp_add_pattern": "gemini mcp add -s user {name} {cmd}",
    },
    "kimi": {
        "display_name": "Kimi CLI",
        "command": "kimi",
        "capabilities": "MCP; MCP setup: auto",
        "mcp_add_pattern": "kimi mcp add --transport stdio {name} -- {cmd}",
    },
    "neovate": {
        "display_name": "Neovate Code",
        "command": "neovate",
        "capabilities": "MCP; MCP setup: auto",
        "mcp_add_pattern": "neovate mcp add -g {name} {cmd}",
    },
    "custom": {
        "display_name": "Custom Runtime",
        "command": "custom",
        "capabilities": "MCP; MCP setup: manual",
        "mcp_add_pattern": None,
    },
}

# First-class supported runtimes (CCCC manages startup defaults + MCP wiring)
PRIMARY_RUNTIMES = ["claude", "codex", "droid", "amp", "auggie", "neovate", "gemini", "kimi"]

_RUNTIME_PROBE_TIMEOUT_SECONDS = 6.0
_RUNTIME_PROBE_ARGS: Dict[str, List[str]] = {
    "amp": ["--version"],
    "auggie": ["--version"],
    "claude": ["--version"],
    "codex": ["--version"],
    "droid": ["--version"],
    "gemini": ["--version"],
    "kimi": ["--version"],
    "neovate": ["--version"],
}


def detect_runtime(name: str) -> RuntimeInfo:
    """Detect if a specific runtime is available on the system."""
    config = KNOWN_RUNTIMES.get(name)
    if not config:
        return RuntimeInfo(
            name=name,
            display_name=name,
            command=name,
            available=False,
            path=None,
            capabilities="Unknown runtime",
            mcp_add_command=None,
        )
    
    # Custom is "supported", but not auto-detectable as installed (user provides the actual command line).
    if name == "custom":
        return RuntimeInfo(
            name=name,
            display_name=config["display_name"],
            command=config["command"],
            available=False,
            path=None,
            capabilities=config["capabilities"],
            mcp_add_command=None,
        )

    command = config["command"]
    path = find_subprocess_executable(command)
    available = path is not None
    
    mcp_add_command = None
    if config.get("mcp_add_pattern") and available:
        # Parse the pattern into a command list
        # This is just for reference; actual execution happens elsewhere
        mcp_add_command = config["mcp_add_pattern"].split()
    
    return RuntimeInfo(
        name=name,
        display_name=config["display_name"],
        command=command,
        available=available,
        path=path,
        capabilities=config["capabilities"],
        mcp_add_command=mcp_add_command,
    )


def detect_all_runtimes(primary_only: bool = True) -> List[RuntimeInfo]:
    """Detect all known runtimes on the system.
    
    Args:
        primary_only: If True, only check first-class runtimes (claude, codex, droid, amp, auggie, neovate, gemini, kimi).
                     If False, check all configured runtimes (including custom).
    
    Returns:
        List of RuntimeInfo for each runtime.
    """
    names = PRIMARY_RUNTIMES if primary_only else list(KNOWN_RUNTIMES.keys())
    return [detect_runtime(name) for name in names]


def get_available_runtimes(primary_only: bool = True) -> List[RuntimeInfo]:
    """Get only the runtimes that are available on the system."""
    return [r for r in detect_all_runtimes(primary_only) if r.available]


def get_runtime_command(name: str) -> List[str]:
    """Get the default command for a runtime.
    
    Returns the command as a list suitable for subprocess.
    """
    if name == "custom":
        return []
    config = KNOWN_RUNTIMES.get(name)
    if not config:
        return [name]
    return [config["command"]]


def get_cccc_mcp_stdio_command() -> List[str]:
    """Return the most stable command line for launching `cccc mcp`.

    Prefer an absolute path to the installed `cccc` entrypoint when available.
    On Windows this avoids relying on runtime-specific PATH inheritance for MCP
    child processes. Fall back to the current Python interpreter otherwise.
    """
    candidates: List[Path] = []
    is_windows = sys.platform.startswith("win")
    try:
        bin_dir = Path(sys.executable).resolve().parent
        names = ["cccc.exe", "cccc.cmd", "cccc.bat", "cccc", "cccc-script.py"] if is_windows else ["cccc"]
        for name in names:
            candidate = bin_dir / name
            if candidate.exists():
                candidates.append(candidate)
    except Exception:
        pass
    for raw in (shutil.which("cccc"), shutil.which("cccc.exe") if is_windows else None):
        if raw:
            candidates.append(Path(raw))
    seen: set[str] = set()
    for candidate in candidates:
        try:
            resolved = str(candidate.resolve())
        except Exception:
            resolved = str(candidate)
        if not resolved or resolved in seen:
            continue
        seen.add(resolved)
        return [resolved, "mcp"]
    return [sys.executable, "-m", "cccc.ports.mcp.main"]


_CODEX_REQUIRED_CONFIG_OVERRIDES: tuple[tuple[str, str], ...] = (
    ("shell_environment_policy.inherit", "all"),
    ("features.multi_agent", "true"),
)


def apply_codex_cli_overrides(command: List[str]) -> List[str]:
    """Normalize Codex CLI config overrides on a command line.

    This keeps CCCC on the current `multi_agent` feature flag while stripping
    any deprecated `features.collab` override from the command line.
    """
    cmd = [str(part) for part in (command or []) if str(part).strip()]
    if not cmd:
        return []

    try:
        exe = os.path.splitext(ntpath.basename(str(cmd[0] or "")))[0].lower()
    except Exception:
        exe = str(cmd[0] or "").strip().lower()
    if exe != "codex":
        return cmd

    override_keys = {key for key, _ in _CODEX_REQUIRED_CONFIG_OVERRIDES}
    strip_keys = set(override_keys)
    strip_keys.add("features.collab")
    remainder: List[str] = []
    index = 1
    while index < len(cmd):
        token = str(cmd[index] or "")
        if token == "-c" and index + 1 < len(cmd):
            raw_value = str(cmd[index + 1] or "").strip()
            key = raw_value.split("=", 1)[0].strip() if raw_value else ""
            if key in strip_keys:
                index += 2
                continue
            remainder.extend([token, raw_value])
            index += 2
            continue
        remainder.append(token)
        index += 1

    normalized: List[str] = [cmd[0]]
    for key, value in _CODEX_REQUIRED_CONFIG_OVERRIDES:
        normalized.extend(["-c", f"{key}={value}"])
    normalized.extend(remainder)
    return normalized


def get_runtime_command_with_flags(name: str) -> List[str]:
    """Get the command with recommended flags for autonomous operation."""
    commands = {
        "amp": ["amp"],
        "auggie": ["auggie"],
        "claude": ["claude", "--dangerously-skip-permissions"],
        # Codex spawns MCP servers as subprocesses; ensure it inherits actor env
        # (CCCC_GROUP_ID/CCCC_ACTOR_ID), and keep feature flags on the supported
        # multi-agent path without surfacing deprecated `features.collab`.
        "codex": apply_codex_cli_overrides(["codex", "--dangerously-bypass-approvals-and-sandbox", "--search"]),
        "droid": ["droid", "--auto", "high"],
        "gemini": ["gemini", "--yolo"],
        "kimi": ["kimi", "--yolo"],
        "neovate": ["neovate"],
        "custom": [],
    }
    return commands.get(name, [name])


def format_command_for_web(command: List[str]) -> str:
    """Serialize argv so the web client can round-trip it back into tokens."""
    parts = [str(part).strip() for part in (command or []) if str(part).strip()]
    if not parts:
        return ""
    if os.name == "nt":
        return subprocess.list2cmdline(parts)
    return shlex.join(parts)


def get_default_interactive_shell_command() -> List[str]:
    """Return the best interactive shell command available on this host."""
    raw_candidates: List[List[str]] = []
    if os.name == "nt":
        comspec = str(os.environ.get("COMSPEC") or "").strip()
        if comspec:
            raw_candidates.append([comspec])
        raw_candidates.extend([
            ["pwsh", "-NoLogo"],
            ["powershell", "-NoLogo"],
            ["cmd.exe"],
            ["cmd"],
        ])
    else:
        login_shell = str(os.environ.get("SHELL") or "").strip()
        if login_shell:
            raw_candidates.append([login_shell, "-i"])
        raw_candidates.extend([
            ["/bin/zsh", "-i"],
            ["zsh", "-i"],
            ["/bin/bash", "-i"],
            ["bash", "-i"],
            ["/bin/sh", "-i"],
            ["sh", "-i"],
        ])

    resolved_candidates: List[List[str]] = []
    seen: set[tuple[str, ...]] = set()
    for raw in raw_candidates:
        executable = str(raw[0] or "").strip()
        if not executable:
            continue
        resolved = find_subprocess_executable(executable)
        if not resolved:
            continue
        candidate = [resolved, *[str(part).strip() for part in raw[1:] if str(part).strip()]]
        key = tuple(candidate)
        if key in seen:
            continue
        seen.add(key)
        resolved_candidates.append(candidate)

    return resolved_candidates[0] if resolved_candidates else []


def _strip_ansi(text: str) -> str:
    return re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", str(text or ""))


def _normalize_probe_output(text: str, *, limit: int = 280) -> str:
    cleaned = " ".join(_strip_ansi(text).split())
    if not cleaned:
        return ""
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: max(0, limit - 3)].rstrip() + "..."


def _runtime_probe_command(runtime: str, command: Optional[List[str]] = None) -> List[str]:
    rt = str(runtime or "").strip()
    info = detect_runtime(rt)
    probe_args = list(_RUNTIME_PROBE_ARGS.get(rt) or [])
    if not probe_args:
        return []

    executable = str(info.path or "").strip()
    if not executable:
        cmd = [str(part) for part in (command or []) if str(part).strip()]
        executable = str(cmd[0] or "").strip() if cmd else ""
    if not executable:
        executable = str((KNOWN_RUNTIMES.get(rt) or {}).get("command") or "").strip()
    if not executable:
        return []
    return [executable, *probe_args]


def _runtime_probe_error(runtime: str, command: Optional[List[str]] = None) -> str:
    rt = str(runtime or "").strip()
    probe_cmd = _runtime_probe_command(rt, command)
    if not probe_cmd:
        return ""

    label = str((KNOWN_RUNTIMES.get(rt) or {}).get("display_name") or rt or "runtime").strip() or "runtime"
    try:
        result = subprocess.run(
            resolve_subprocess_argv(probe_cmd),
            capture_output=True,
            text=True,
            check=False,
            timeout=_RUNTIME_PROBE_TIMEOUT_SECONDS,
        )
    except FileNotFoundError:
        executable = str(probe_cmd[0] or "").strip()
        return f"runtime unavailable: {label} executable not found: {executable}"
    except subprocess.TimeoutExpired:
        return f"runtime unavailable: {label} startup probe timed out"
    except Exception as e:
        return f"runtime unavailable: {label} startup probe failed: {e}"

    if int(getattr(result, "returncode", 1) or 0) == 0:
        return ""

    detail = _normalize_probe_output(
        "\n".join(
            part
            for part in (
                str(getattr(result, "stderr", "") or "").strip(),
                str(getattr(result, "stdout", "") or "").strip(),
            )
            if part
        )
    )
    if detail:
        return f"runtime unavailable: {label} failed to start: {detail}"
    return f"runtime unavailable: {label} exited with status {result.returncode} during startup probe"


def runtime_start_preflight_error(runtime: str, command: Optional[List[str]] = None, *, runner: str = "pty") -> str:
    """Return a user-facing startup error when a runtime cannot be launched.

    This is intentionally stricter than schema validation:
    - It checks whether the executable actually exists on this machine.
    - It keeps headless actors out of the check because they do not spawn a CLI process.
    """
    runner_kind = str(runner or "pty").strip() or "pty"
    if runner_kind == "headless":
        return ""

    rt = str(runtime or "").strip()
    cmd = [str(part) for part in (command or []) if str(part).strip()]

    if rt == "custom":
        if not cmd:
            return "custom runtime requires a command (PTY runner)"
        executable = str(cmd[0] or "").strip()
        if find_subprocess_executable(executable):
            return ""
        return f"runtime unavailable: custom runtime command not found: {executable}"

    info = detect_runtime(rt)
    if info.available:
        return _runtime_probe_error(rt, cmd)

    command_hint = list(cmd or get_runtime_command_with_flags(rt))
    executable = str(command_hint[0] or "").strip() if command_hint else ""
    if executable and find_subprocess_executable(executable):
        return _runtime_probe_error(rt, cmd)

    label = str(info.display_name or rt or "runtime").strip() or "runtime"
    if executable and executable != rt:
        return f"runtime unavailable: {label} executable not found: {executable}"
    return f"runtime unavailable: {label} is not installed or not in PATH"
