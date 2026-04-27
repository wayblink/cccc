from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


class TestSessionScopedMcp(unittest.TestCase):
    def test_codex_command_gets_session_scoped_cccc_mcp_overrides(self) -> None:
        from cccc.kernel.runtime_session_mcp import inject_session_scoped_mcp

        with patch(
            "cccc.kernel.runtime_session_mcp.get_cccc_mcp_stdio_command",
            return_value=["/tmp/cccc bin/cccc", "mcp"],
        ):
            cmd = inject_session_scoped_mcp("codex", ["codex", "--search"])

        self.assertEqual(cmd[0], "codex")
        self.assertIn("--search", cmd)
        pairs = [(cmd[i], cmd[i + 1]) for i in range(len(cmd) - 1) if cmd[i] == "-c"]
        values = [value for _flag, value in pairs]
        self.assertIn('mcp_servers.cccc.command="/tmp/cccc bin/cccc"', values)
        self.assertIn('mcp_servers.cccc.args=["mcp"]', values)

    def test_claude_command_gets_strict_session_mcp_config(self) -> None:
        from cccc.kernel.runtime_session_mcp import inject_session_scoped_mcp

        with patch(
            "cccc.kernel.runtime_session_mcp.get_cccc_mcp_stdio_command",
            return_value=["/tmp/cccc", "mcp"],
        ):
            cmd = inject_session_scoped_mcp("claude", ["claude", "--dangerously-skip-permissions"])

        self.assertIn("--strict-mcp-config", cmd)
        idx = cmd.index("--mcp-config")
        config = json.loads(cmd[idx + 1])
        self.assertEqual(config["mcpServers"]["cccc"], {"command": "/tmp/cccc", "args": ["mcp"]})

    def test_actor_mcp_ready_does_not_call_global_installer_for_codex(self) -> None:
        from cccc.daemon.actors.actor_runtime_ops import ensure_actor_mcp_ready

        group = SimpleNamespace(group_id="g1", doc={"agent_link_mode": "connected"})
        calls: list[str] = []

        ok, error = ensure_actor_mcp_ready(
            group,
            "a1",
            runtime="codex",
            cwd=Path.cwd(),
            effective_env={"CCCC_GROUP_ID": "g1"},
            effective_runner="pty",
            ensure_mcp_installed=lambda *_args, **_kwargs: calls.append("called") or True,
        )

        self.assertTrue(ok)
        self.assertIsNone(error)
        self.assertEqual(calls, [])

    def test_resolve_actor_launch_spec_injects_session_mcp_before_launch(self) -> None:
        from cccc.daemon.actors.actor_runtime_ops import resolve_actor_launch_spec

        with tempfile.TemporaryDirectory() as tmp:
            group = SimpleNamespace(
                group_id="g1",
                doc={
                    "active_scope_key": "main",
                    "actors": [
                        {
                            "id": "a1",
                            "runtime": "codex",
                            "runner": "pty",
                            "command": ["codex", "--search"],
                            "env": {},
                        }
                    ],
                },
            )
            with patch(
                "cccc.kernel.runtime_session_mcp.get_cccc_mcp_stdio_command",
                return_value=["/tmp/cccc", "mcp"],
            ):
                spec = resolve_actor_launch_spec(
                    group,
                    "a1",
                    command=["codex", "--search"],
                    env={},
                    runner="pty",
                    runtime="codex",
                    find_scope_url=lambda _group, _scope: tmp,
                    effective_runner_kind=lambda runner: runner,
                    normalize_runtime_command=lambda _runtime, command: list(command),
                    supported_runtimes=("codex",),
                )

        self.assertIn("-c", spec["effective_command"])
        self.assertIn('mcp_servers.cccc.command="/tmp/cccc"', spec["effective_command"])

class TestGlobalMcpGuard(unittest.TestCase):
    def test_tools_list_is_empty_without_actor_runtime_context(self) -> None:
        from cccc.ports.mcp.common import _RuntimeContext
        from cccc.ports.mcp.server import list_tools_for_caller

        with patch(
            "cccc.ports.mcp.server._runtime_context",
            return_value=_RuntimeContext(home="/tmp/cccc", group_id="", actor_id=""),
        ):
            self.assertEqual(list_tools_for_caller(), [])
