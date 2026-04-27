import json
import os
import unittest
from unittest.mock import patch


class TestRuntimeCommandDefaults(unittest.TestCase):
    def test_copilot_runtime_enables_tool_auto_approval(self) -> None:
        from cccc.kernel.runtime import get_runtime_command_with_flags

        self.assertEqual(
            get_runtime_command_with_flags("copilot"),
            ["copilot", "-s", "--allow-all-tools"],
        )

    def test_copilot_session_scoped_mcp_supported(self) -> None:
        from cccc.kernel.runtime_session_mcp import session_scoped_mcp_supported

        self.assertTrue(session_scoped_mcp_supported("copilot"))
        self.assertTrue(session_scoped_mcp_supported("claude"))
        self.assertTrue(session_scoped_mcp_supported("codex"))
        self.assertFalse(session_scoped_mcp_supported("amp"))
        self.assertFalse(session_scoped_mcp_supported("gemini"))

    def test_copilot_session_mcp_injects_additional_mcp_config(self) -> None:
        from cccc.kernel.runtime_session_mcp import inject_session_scoped_mcp

        fake_mcp_cmd = ["/usr/local/bin/cccc", "mcp"]
        with patch("cccc.kernel.runtime_session_mcp.get_cccc_mcp_stdio_command", return_value=fake_mcp_cmd):
            result = inject_session_scoped_mcp("copilot", ["copilot", "-s", "--allow-all-tools"])

        self.assertEqual(result[0], "copilot")
        self.assertEqual(result[1], "--additional-mcp-config")
        config = json.loads(result[2])
        self.assertEqual(config["mcpServers"]["cccc"]["command"], "/usr/local/bin/cccc")
        self.assertEqual(config["mcpServers"]["cccc"]["args"], ["mcp"])
        self.assertIn("-s", result)
        self.assertIn("--allow-all-tools", result)

    def test_copilot_session_mcp_strips_existing_additional_mcp_config(self) -> None:
        from cccc.kernel.runtime_session_mcp import inject_session_scoped_mcp

        fake_mcp_cmd = ["/usr/local/bin/cccc", "mcp"]
        old_config = json.dumps({"mcpServers": {"cccc": {"command": "/old/cccc", "args": ["mcp"]}}})
        with patch("cccc.kernel.runtime_session_mcp.get_cccc_mcp_stdio_command", return_value=fake_mcp_cmd):
            result = inject_session_scoped_mcp(
                "copilot", ["copilot", "-s", "--additional-mcp-config", old_config, "--allow-all-tools"]
            )

        config_values = [result[i + 1] for i, t in enumerate(result) if t == "--additional-mcp-config"]
        self.assertEqual(len(config_values), 1)
        config = json.loads(config_values[0])
        self.assertEqual(config["mcpServers"]["cccc"]["command"], "/usr/local/bin/cccc")

    def test_kimi_runtime_uses_yolo_flags_for_launch(self) -> None:
        from cccc.kernel.runtime import get_runtime_command_with_flags

        self.assertEqual(get_runtime_command_with_flags("kimi"), ["kimi", "--yolo"])

    def test_format_command_for_web_quotes_shell_args(self) -> None:
        from cccc.kernel.runtime import format_command_for_web

        self.assertEqual(format_command_for_web(["/bin/zsh", "-lc", "echo hello world"]), "/bin/zsh -lc 'echo hello world'")

    def test_default_interactive_shell_prefers_login_shell(self) -> None:
        from cccc.kernel.runtime import get_default_interactive_shell_command

        with patch.dict(os.environ, {"SHELL": "/bin/bash"}, clear=False), patch(
            "cccc.kernel.runtime.find_subprocess_executable",
            side_effect=lambda command: command if command in {"/bin/bash", "/bin/zsh"} else None,
        ):
            self.assertEqual(get_default_interactive_shell_command(), ["/bin/bash", "-i"])


if __name__ == "__main__":
    unittest.main()
