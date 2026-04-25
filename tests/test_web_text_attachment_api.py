import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class TestWebTextAttachmentApi(unittest.TestCase):
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

    def test_read_text_attachment_returns_utf8_content(self) -> None:
        from cccc.kernel.group import create_group
        from cccc.kernel.registry import load_registry
        from cccc.kernel.blobs import store_blob_bytes

        _, cleanup = self._with_home()
        try:
            reg = load_registry()
            group = create_group(reg, title="text-reader", topic="")
            attachment = store_blob_bytes(
                group,
                data="hello, 世界\n".encode("utf-8"),
                filename="notes.md",
                mime_type="text/markdown",
            )

            with self._client() as client:
                resp = client.get(
                    f"/api/v1/groups/{group.group_id}/attachments/text",
                    params={"path": attachment["path"]},
                )

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertTrue(bool(body.get("ok")))
            result = body.get("result") or {}
            self.assertEqual(result.get("path"), attachment["path"])
            self.assertEqual(result.get("title"), "notes.md")
            self.assertEqual(result.get("mime_type"), "text/markdown")
            self.assertEqual(result.get("content"), "hello, 世界\n")
        finally:
            cleanup()

    def test_read_text_attachment_rejects_invalid_binary_and_oversized_blobs(self) -> None:
        from cccc.kernel.group import create_group
        from cccc.kernel.registry import load_registry
        from cccc.kernel.blobs import MAX_TEXT_ATTACHMENT_BYTES, store_blob_bytes

        _, cleanup = self._with_home()
        try:
            reg = load_registry()
            group = create_group(reg, title="text-reader-errors", topic="")
            binary = store_blob_bytes(
                group,
                data=b"\x00\x01\x02\x03",
                filename="payload.bin",
                mime_type="application/octet-stream",
            )
            oversized = store_blob_bytes(
                group,
                data=b"a" * (MAX_TEXT_ATTACHMENT_BYTES + 1),
                filename="huge.txt",
                mime_type="text/plain",
            )

            with self._client() as client:
                invalid_path = client.get(
                    f"/api/v1/groups/{group.group_id}/attachments/text",
                    params={"path": "state/ledger/demo.txt"},
                )
                binary_resp = client.get(
                    f"/api/v1/groups/{group.group_id}/attachments/text",
                    params={"path": binary["path"]},
                )
                oversized_resp = client.get(
                    f"/api/v1/groups/{group.group_id}/attachments/text",
                    params={"path": oversized["path"]},
                )

            self.assertEqual(invalid_path.status_code, 400)
            self.assertEqual(((invalid_path.json().get("error") or {}).get("code")), "invalid_attachment")
            self.assertEqual(binary_resp.status_code, 415)
            self.assertEqual(((binary_resp.json().get("error") or {}).get("code")), "unsupported_attachment")
            self.assertEqual(oversized_resp.status_code, 413)
            self.assertEqual(((oversized_resp.json().get("error") or {}).get("code")), "attachment_too_large")
        finally:
            cleanup()

    def test_save_text_attachment_stores_new_blob(self) -> None:
        from cccc.kernel.group import create_group
        from cccc.kernel.registry import load_registry

        home, cleanup = self._with_home()
        try:
            reg = load_registry()
            group = create_group(reg, title="text-save", topic="")

            with self._client() as client:
                resp = client.post(
                    f"/api/v1/groups/{group.group_id}/attachments/text/save",
                    json={
                        "filename": "draft.py",
                        "content": "print('hello')\n",
                        "mime_type": "text/x-python",
                    },
                )

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertTrue(bool(body.get("ok")))
            attachment = (body.get("result") or {}).get("attachment") or {}
            self.assertEqual(attachment.get("title"), "draft.py")
            self.assertEqual(attachment.get("mime_type"), "text/x-python")
            self.assertTrue(str(attachment.get("path") or "").startswith("state/blobs/"))
            stored_path = Path(home) / "groups" / group.group_id / str(attachment.get("path") or "")
            self.assertTrue(stored_path.exists())
            self.assertEqual(stored_path.read_text(encoding="utf-8"), "print('hello')\n")

        finally:
            cleanup()

    def test_save_text_attachment_rejects_invalid_filename_and_oversized_content(self) -> None:
        from cccc.kernel.group import create_group
        from cccc.kernel.registry import load_registry
        from cccc.kernel.blobs import MAX_TEXT_ATTACHMENT_BYTES

        _, cleanup = self._with_home()
        try:
            reg = load_registry()
            group = create_group(reg, title="text-save-errors", topic="")

            with self._client() as client:
                invalid_filename = client.post(
                    f"/api/v1/groups/{group.group_id}/attachments/text/save",
                    json={"filename": "   ", "content": "hello"},
                )
                oversized = client.post(
                    f"/api/v1/groups/{group.group_id}/attachments/text/save",
                    json={"filename": "huge.txt", "content": "a" * (MAX_TEXT_ATTACHMENT_BYTES + 1)},
                )

            self.assertEqual(invalid_filename.status_code, 400)
            self.assertEqual(((invalid_filename.json().get("error") or {}).get("code")), "invalid_filename")
            self.assertEqual(oversized.status_code, 413)
            self.assertEqual(((oversized.json().get("error") or {}).get("code")), "attachment_too_large")
        finally:
            cleanup()


if __name__ == "__main__":
    unittest.main()
