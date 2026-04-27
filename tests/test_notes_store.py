import json
import tempfile
import unittest
from pathlib import Path


class TestNotesStore(unittest.TestCase):
    def test_list_notes_creates_empty_scratchpad_without_writing(self) -> None:
        from cccc.daemon.notes.notes_store import SCRATCHPAD_NOTE_ID, list_notes, notes_state_path

        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            snapshot = list_notes(home=home)

            self.assertEqual(snapshot["selected_note_id"], SCRATCHPAD_NOTE_ID)
            self.assertEqual(len(snapshot["notes"]), 1)
            self.assertEqual(snapshot["notes"][0]["id"], SCRATCHPAD_NOTE_ID)
            self.assertEqual(snapshot["notes"][0]["body"], "")
            self.assertFalse(notes_state_path(home=home).exists())

    def test_create_and_update_note_persist_to_home_state(self) -> None:
        from cccc.daemon.notes.notes_store import create_note, notes_state_path, update_note

        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            created = create_note(title="Draft", body="hello", home=home)
            note_id = created["id"]
            updated = update_note(note_id, {"title": "Plan", "body": "hello world"}, home=home)

            self.assertEqual(updated["title"], "Plan")
            self.assertEqual(updated["body"], "hello world")
            raw = json.loads(notes_state_path(home=home).read_text(encoding="utf-8"))
            persisted = next(note for note in raw["notes"] if note["id"] == note_id)
            self.assertEqual(persisted["title"], "Plan")
            self.assertEqual(persisted["body"], "hello world")

    def test_scratchpad_can_update_but_not_delete(self) -> None:
        from cccc.daemon.notes.notes_store import SCRATCHPAD_NOTE_ID, delete_note, list_notes, update_note

        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            updated = update_note(SCRATCHPAD_NOTE_ID, {"title": "ignored", "body": "keep me"}, home=home)
            self.assertEqual(updated["title"], "Scratchpad")
            self.assertEqual(updated["body"], "keep me")
            self.assertFalse(delete_note(SCRATCHPAD_NOTE_ID, home=home))
            snapshot = list_notes(home=home)
            self.assertEqual(snapshot["notes"][0]["body"], "keep me")

    def test_import_notes_merges_local_snapshot_when_server_is_default(self) -> None:
        from cccc.daemon.notes.notes_store import SCRATCHPAD_NOTE_ID, import_notes, list_notes

        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            snapshot = import_notes(
                {
                    "selectedNoteId": SCRATCHPAD_NOTE_ID,
                    "notes": [
                        {"id": SCRATCHPAD_NOTE_ID, "kind": "scratchpad", "title": "Scratchpad", "body": "old local"},
                        {"id": "note-local", "kind": "note", "title": "Local", "body": "note body"},
                    ],
                },
                home=home,
            )
            self.assertEqual(snapshot["selected_note_id"], SCRATCHPAD_NOTE_ID)
            self.assertEqual([note["id"] for note in snapshot["notes"]], [SCRATCHPAD_NOTE_ID, "note-local"])
            self.assertEqual(list_notes(home=home)["notes"][0]["body"], "old local")


if __name__ == "__main__":
    unittest.main()
