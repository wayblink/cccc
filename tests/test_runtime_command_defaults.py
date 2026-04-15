import os
import unittest
from unittest.mock import patch


class TestRuntimeCommandDefaults(unittest.TestCase):
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
