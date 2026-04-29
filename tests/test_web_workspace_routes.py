import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class TestWebWorkspaceRoutes(unittest.TestCase):
    def _with_home(self):
        old_home = os.environ.get("CCCC_HOME")
        td_ctx = tempfile.TemporaryDirectory()
        td = td_ctx.__enter__()
        os.environ["CCCC_HOME"] = td

        def cleanup() -> None:
            td_ctx.__exit__(None, None, None)
            if old_home is None:
                os.environ.pop("CCCC_HOME", None)
            else:
                os.environ["CCCC_HOME"] = old_home

        return td, cleanup

    def _client(self) -> TestClient:
        from cccc.ports.web.app import create_app

        return TestClient(create_app())

    def _create_group_with_scope(self, workspace: Path) -> str:
        from cccc.kernel.group import attach_scope_to_group, create_group
        from cccc.kernel.registry import load_registry
        from cccc.kernel.scope import detect_scope

        reg = load_registry()
        group = create_group(reg, title="workspace-routes", topic="")
        attach_scope_to_group(reg, group, detect_scope(workspace), set_active=True)
        return group.group_id

    def _git(self, repo: Path, *args: str) -> None:
        subprocess.run(["git", *args], cwd=str(repo), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    def _init_repo(self, repo: Path) -> None:
        self._git(repo, "init")
        self._git(repo, "config", "user.email", "workspace-routes@example.test")
        self._git(repo, "config", "user.name", "Workspace Routes")
        (repo / "tracked.txt").write_text("before\n", encoding="utf-8")
        self._git(repo, "add", "tracked.txt")
        self._git(repo, "commit", "-m", "baseline")

    def test_workspace_tree_lists_active_scope_relative_paths(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            (workspace / "src").mkdir()
            (workspace / "src" / "main.py").write_text("print('hello')\n", encoding="utf-8")
            (workspace / "README.md").write_text("# demo\n", encoding="utf-8")
            (workspace / ".hidden").write_text("secret\n", encoding="utf-8")
            (workspace / "node_modules").mkdir()
            (workspace / "node_modules" / "pkg.js").write_text("module.exports = 1\n", encoding="utf-8")
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/tree")

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertTrue(bool(body.get("ok")), body)
            result = body.get("result") or {}
            self.assertEqual(result.get("path"), "")
            self.assertEqual(result.get("parent"), None)
            self.assertEqual(result.get("root_path"), str(workspace.resolve()))
            items = result.get("items") or []
            by_name = {item.get("name"): item for item in items}
            self.assertEqual(by_name["src"]["path"], "src")
            self.assertTrue(bool(by_name["src"]["is_dir"]))
            self.assertEqual(by_name["README.md"]["path"], "README.md")
            self.assertFalse(bool(by_name["README.md"]["is_dir"]))
            self.assertNotIn(".hidden", by_name)
            self.assertNotIn("node_modules", by_name)
            for item in items:
                self.assertFalse(str(item.get("path") or "").startswith(str(workspace)))
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_tree_rejects_parent_traversal(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/tree", params={"path": "../outside"})

            self.assertEqual(resp.status_code, 400)
            body = resp.json()
            self.assertFalse(bool(body.get("ok")), body)
            self.assertEqual((body.get("error") or {}).get("code"), "workspace_out_of_scope")
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_previews_text_content(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            (workspace / "notes.txt").write_text("hello\nworld\n", encoding="utf-8")
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/file", params={"path": "notes.txt"})

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertTrue(bool(body.get("ok")), body)
            result = body.get("result") or {}
            self.assertEqual(result.get("path"), "notes.txt")
            self.assertEqual(result.get("name"), "notes.txt")
            self.assertFalse(bool(result.get("is_binary")))
            self.assertFalse(bool(result.get("truncated")))
            self.assertEqual(result.get("content"), "hello\nworld\n")
            self.assertEqual(result.get("size"), 12)
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_marks_binary_without_content(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            (workspace / "image.bin").write_bytes(b"\x89PNG\x00\x01")
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/file", params={"path": "image.bin"})

            self.assertEqual(resp.status_code, 200)
            result = (resp.json().get("result") or {})
            self.assertTrue(bool(result.get("is_binary")), result)
            self.assertEqual(result.get("content"), "")
            self.assertEqual(result.get("size"), 6)
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_marks_png_as_image_preview(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            (workspace / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + (b"0" * (512 * 1024)))
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/file", params={"path": "logo.png"})

            self.assertEqual(resp.status_code, 200)
            result = (resp.json().get("result") or {})
            self.assertEqual(result.get("mime_type"), "image/png")
            self.assertEqual(result.get("preview_type"), "image")
            self.assertTrue(bool(result.get("is_binary")), result)
            self.assertFalse(bool(result.get("truncated")), result)
            self.assertEqual(result.get("content"), "")
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_image_serves_png_bytes_inline(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
            (workspace / "logo.png").write_bytes(png)
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/file/image", params={"path": "logo.png"})

            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.content, png)
            self.assertTrue(str(resp.headers.get("content-type") or "").startswith("image/png"))
            self.assertEqual(resp.headers.get("cache-control"), "no-store")
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_image_serves_jpeg_bytes_inline(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF"
            (workspace / "photo.jpg").write_bytes(jpeg)
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                meta_resp = client.get(f"/api/v1/groups/{group_id}/workspace/file", params={"path": "photo.jpg"})
                image_resp = client.get(f"/api/v1/groups/{group_id}/workspace/file/image", params={"path": "photo.jpg"})

            self.assertEqual(meta_resp.status_code, 200)
            result = (meta_resp.json().get("result") or {})
            self.assertEqual(result.get("mime_type"), "image/jpeg")
            self.assertEqual(result.get("preview_type"), "image")
            self.assertTrue(bool(result.get("is_binary")), result)
            self.assertEqual(result.get("content"), "")

            self.assertEqual(image_resp.status_code, 200)
            self.assertEqual(image_resp.content, jpeg)
            self.assertTrue(str(image_resp.headers.get("content-type") or "").startswith("image/jpeg"))
            self.assertEqual(image_resp.headers.get("cache-control"), "no-store")
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_image_rejects_non_image_file(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            (workspace / "notes.txt").write_text("hello\n", encoding="utf-8")
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/file/image", params={"path": "notes.txt"})

            self.assertEqual(resp.status_code, 400)
            body = resp.json()
            self.assertFalse(bool(body.get("ok")), body)
            self.assertEqual((body.get("error") or {}).get("code"), "workspace_unsupported_image")
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_truncates_large_text(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            payload = "a" * (512 * 1024 + 20)
            (workspace / "large.txt").write_text(payload, encoding="utf-8")
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/file", params={"path": "large.txt"})

            self.assertEqual(resp.status_code, 200)
            result = (resp.json().get("result") or {})
            self.assertTrue(bool(result.get("truncated")), result)
            self.assertFalse(bool(result.get("is_binary")))
            self.assertEqual(len(str(result.get("content") or "")), 512 * 1024)
            self.assertEqual(result.get("size"), len(payload))
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_file_rejects_directory_preview(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            (workspace / "src").mkdir()
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/file", params={"path": "src"})

            self.assertEqual(resp.status_code, 400)
            body = resp.json()
            self.assertFalse(bool(body.get("ok")), body)
            self.assertEqual((body.get("error") or {}).get("code"), "workspace_not_file")
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_git_status_lists_changes(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            self._init_repo(workspace)
            (workspace / "tracked.txt").write_text("after\n", encoding="utf-8")
            (workspace / "untracked.txt").write_text("new\n", encoding="utf-8")
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/git/status")

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertTrue(bool(body.get("ok")), body)
            result = body.get("result") or {}
            self.assertTrue(bool(result.get("is_git_repo")), result)
            by_path = {item.get("path"): item for item in (result.get("items") or [])}
            self.assertEqual((by_path.get("tracked.txt") or {}).get("status"), "modified")
            self.assertEqual((by_path.get("untracked.txt") or {}).get("status"), "untracked")
            for item in by_path.values():
                self.assertFalse(str(item.get("path") or "").startswith(str(workspace)))
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_git_status_handles_non_git_scope(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/git/status")

            self.assertEqual(resp.status_code, 200)
            result = resp.json().get("result") or {}
            self.assertFalse(bool(result.get("is_git_repo")), result)
            self.assertEqual(result.get("items"), [])
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_git_diff_returns_file_diff(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            self._init_repo(workspace)
            (workspace / "tracked.txt").write_text("after\n", encoding="utf-8")
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/git/diff", params={"path": "tracked.txt"})

            self.assertEqual(resp.status_code, 200)
            result = resp.json().get("result") or {}
            self.assertTrue(bool(result.get("is_git_repo")), result)
            self.assertEqual(result.get("path"), "tracked.txt")
            self.assertFalse(bool(result.get("truncated")), result)
            self.assertIn("diff --git a/tracked.txt b/tracked.txt", str(result.get("diff") or ""))
            self.assertIn("+after", str(result.get("diff") or ""))
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()

    def test_workspace_git_diff_rejects_parent_traversal(self) -> None:
        _, cleanup = self._with_home()
        workspace_ctx = tempfile.TemporaryDirectory()
        try:
            workspace = Path(workspace_ctx.__enter__())
            self._init_repo(workspace)
            group_id = self._create_group_with_scope(workspace)

            with self._client() as client:
                resp = client.get(f"/api/v1/groups/{group_id}/workspace/git/diff", params={"path": "../outside.txt"})

            self.assertEqual(resp.status_code, 400)
            body = resp.json()
            self.assertFalse(bool(body.get("ok")), body)
            self.assertEqual((body.get("error") or {}).get("code"), "workspace_out_of_scope")
        finally:
            workspace_ctx.__exit__(None, None, None)
            cleanup()


if __name__ == "__main__":
    unittest.main()
