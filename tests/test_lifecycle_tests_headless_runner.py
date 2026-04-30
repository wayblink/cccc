import ast
from pathlib import Path
import unittest


class TestLifecycleTestsHeadlessRunner(unittest.TestCase):
    def _literal_dicts(self, text: str) -> list[dict[str, object]]:
        out: list[dict[str, object]] = []
        tree = ast.parse(text)
        for node in ast.walk(tree):
            if not isinstance(node, ast.Dict):
                continue
            item: dict[str, object] = {}
            for key, value in zip(node.keys, node.values):
                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                    try:
                        item[key.value] = ast.literal_eval(value)
                    except Exception:
                        pass
            out.append(item)
        return out

    def test_lifecycle_actor_tests_keep_runtime_dependent_flows_headless(self) -> None:
        repo_root = Path(__file__).resolve().parents[1]
        lifecycle_tests = [
            repo_root / "tests" / "test_actor_lifecycle_ops.py",
            repo_root / "tests" / "test_group_lifecycle_invariants.py",
        ]
        for path in lifecycle_tests:
            text = path.read_text(encoding="utf-8")
            self.assertIn('"runner": "headless"', text, msg=f"{path.name} should use headless runner in actor add payloads")
            for payload in self._literal_dicts(text):
                if payload.get("runner") != "pty":
                    continue
                self.assertEqual(
                    payload.get("ui_kind"),
                    "quick_terminal",
                    msg=f"{path.name} PTY payloads must be limited to quick-terminal metadata coverage",
                )
                self.assertEqual(
                    payload.get("runtime"),
                    "custom",
                    msg=f"{path.name} quick-terminal PTY payloads should not depend on agent runtime binaries",
                )
                self.assertIn(
                    "command",
                    payload,
                    msg=f"{path.name} quick-terminal PTY payloads must provide an explicit safe command",
                )


if __name__ == "__main__":
    unittest.main()
