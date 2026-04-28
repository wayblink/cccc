import subprocess
import tempfile
import unittest
from pathlib import Path


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=str(repo), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


class TestWorkspaceGit(unittest.TestCase):
    def _repo(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        td = tempfile.TemporaryDirectory()
        repo = Path(td.__enter__())
        _git(repo, "init")
        _git(repo, "config", "user.email", "workspace-git@example.test")
        _git(repo, "config", "user.name", "Workspace Git")
        (repo / "tracked.txt").write_text("before\n", encoding="utf-8")
        _git(repo, "add", "tracked.txt")
        _git(repo, "commit", "-m", "baseline")
        return td, repo

    def test_git_status_porcelain_parses_relative_statuses(self) -> None:
        from cccc.kernel.git import git_status_porcelain, parse_git_status_porcelain_z

        td, repo = self._repo()
        try:
            (repo / "tracked.txt").write_text("after\n", encoding="utf-8")
            (repo / "untracked.txt").write_text("new\n", encoding="utf-8")

            code, out = git_status_porcelain(repo)
            self.assertEqual(code, 0, out)
            items = parse_git_status_porcelain_z(out)
            by_path = {item["path"]: item for item in items}

            self.assertEqual(by_path["tracked.txt"]["status"], "modified")
            self.assertEqual(by_path["tracked.txt"]["index"], " ")
            self.assertEqual(by_path["tracked.txt"]["worktree"], "M")
            self.assertEqual(by_path["untracked.txt"]["status"], "untracked")
            for item in items:
                self.assertFalse(str(item["path"]).startswith(str(repo)))
        finally:
            td.__exit__(None, None, None)

    def test_git_diff_returns_unified_diff_for_file(self) -> None:
        from cccc.kernel.git import git_diff

        td, repo = self._repo()
        try:
            (repo / "tracked.txt").write_text("after\n", encoding="utf-8")

            code, out = git_diff(repo, "tracked.txt")

            self.assertEqual(code, 0, out)
            self.assertIn("diff --git a/tracked.txt b/tracked.txt", out)
            self.assertIn("-before", out)
            self.assertIn("+after", out)
        finally:
            td.__exit__(None, None, None)


if __name__ == "__main__":
    unittest.main()
