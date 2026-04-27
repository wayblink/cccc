import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class TestWebNotesRoutes(unittest.TestCase):
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

        return Path(td), cleanup

    def _client(self) -> TestClient:
        from cccc.ports.web.app import create_app

        return TestClient(create_app())

    def test_get_notes_returns_default_scratchpad_without_group_scope(self) -> None:
        home, cleanup = self._with_home()
        try:
            client = self._client()

            resp = client.get("/api/v1/user/notes")

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertTrue(body.get("ok"))
            snapshot = (body.get("result") or {}).get("snapshot") or {}
            self.assertEqual(snapshot.get("selected_note_id"), "scratchpad")
            self.assertEqual(len(snapshot.get("notes") or []), 1)
            self.assertEqual(snapshot["notes"][0].get("id"), "scratchpad")
            self.assertFalse((home / "state" / "groups").exists())
        finally:
            cleanup()

    def test_create_update_delete_note_roundtrip_persists_to_home_state(self) -> None:
        home, cleanup = self._with_home()
        try:
            client = self._client()

            created = client.post("/api/v1/user/notes", json={"title": "Plan", "body": "line 1"})
            self.assertEqual(created.status_code, 200)
            self.assertTrue(created.json().get("ok"))
            note = ((created.json().get("result") or {}).get("note")) or {}
            note_id = str(note.get("id") or "")
            self.assertTrue(note_id.startswith("note-"))
            self.assertEqual(note.get("title"), "Plan")

            updated = client.patch(f"/api/v1/user/notes/{note_id}", json={"title": "Plan B", "body": "line 2"})
            self.assertEqual(updated.status_code, 200)
            updated_note = ((updated.json().get("result") or {}).get("note")) or {}
            self.assertEqual(updated_note.get("title"), "Plan B")
            self.assertEqual(updated_note.get("body"), "line 2")

            self.assertTrue((home / "state" / "notes" / "notes.json").exists())

            deleted = client.delete(f"/api/v1/user/notes/{note_id}")
            self.assertEqual(deleted.status_code, 200)
            self.assertTrue(deleted.json().get("ok"))
            notes = (((deleted.json().get("result") or {}).get("snapshot") or {}).get("notes")) or []
            self.assertNotIn(note_id, {item.get("id") for item in notes})
        finally:
            cleanup()

    def test_scratchpad_can_be_updated_but_not_deleted(self) -> None:
        _, cleanup = self._with_home()
        try:
            client = self._client()

            updated = client.patch("/api/v1/user/notes/scratchpad", json={"title": "Ignored", "body": "mobile note"})
            self.assertEqual(updated.status_code, 200)
            note = ((updated.json().get("result") or {}).get("note")) or {}
            self.assertEqual(note.get("id"), "scratchpad")
            self.assertEqual(note.get("title"), "Scratchpad")
            self.assertEqual(note.get("body"), "mobile note")

            deleted = client.delete("/api/v1/user/notes/scratchpad")
            self.assertEqual(deleted.status_code, 400)
            self.assertEqual((deleted.json().get("error") or {}).get("code"), "scratchpad_not_deletable")

            listed = client.get("/api/v1/user/notes")
            notes = (((listed.json().get("result") or {}).get("snapshot") or {}).get("notes")) or []
            self.assertIn("scratchpad", {item.get("id") for item in notes})
        finally:
            cleanup()

    def test_import_notes_accepts_legacy_local_storage_snapshot(self) -> None:
        _, cleanup = self._with_home()
        try:
            client = self._client()

            imported = client.post(
                "/api/v1/user/notes/import",
                json={
                    "selectedNoteId": "note-old",
                    "notes": [
                        {"id": "scratchpad", "kind": "scratchpad", "title": "Old", "body": "scratch"},
                        {"id": "note-old", "kind": "note", "title": "Old note", "body": "legacy"},
                    ],
                },
            )

            self.assertEqual(imported.status_code, 200)
            snapshot = (imported.json().get("result") or {}).get("snapshot") or {}
            self.assertEqual(snapshot.get("selected_note_id"), "note-old")
            by_id = {item.get("id"): item for item in snapshot.get("notes") or []}
            self.assertEqual(by_id["scratchpad"].get("body"), "scratch")
            self.assertEqual(by_id["note-old"].get("body"), "legacy")
        finally:
            cleanup()


if __name__ == "__main__":
    unittest.main()
