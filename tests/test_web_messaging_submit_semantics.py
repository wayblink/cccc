import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


class TestWebMessagingSubmitSemantics(unittest.TestCase):
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

    def _with_env(self, key: str, value: str):
        old_value = os.environ.get(key)
        os.environ[key] = value

        def cleanup() -> None:
            if old_value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = old_value

        return cleanup

    def _client(self) -> TestClient:
        from cccc.ports.web.app import create_app

        return TestClient(create_app())

    def test_reply_surfaces_daemon_error_even_if_async_env_requested(self) -> None:
        from cccc.kernel.group import create_group
        from cccc.kernel.registry import load_registry

        _, cleanup_home = self._with_home()
        cleanup_mode = self._with_env("CCCC_WEB_MESSAGE_SUBMIT_MODE", "async")
        try:
            reg = load_registry()
            group = create_group(reg, title="web-message-semantics", topic="")

            def fake_call_daemon(req: dict) -> dict:
                return {
                    "ok": False,
                    "error": {
                        "code": "event_not_found",
                        "message": "event not found: evt_missing",
                        "details": {},
                    },
                }

            with patch("cccc.ports.web.app.call_daemon", side_effect=fake_call_daemon):
                client = self._client()
                resp = client.post(
                    f"/api/v1/groups/{group.group_id}/reply",
                    json={
                        "text": "bad reply",
                        "by": "user",
                        "to": ["user"],
                        "reply_to": "evt_missing",
                        "client_id": "reply-bad-1",
                    },
                )

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertFalse(bool(body.get("ok")))
            self.assertEqual(str(((body.get("error") or {}).get("code")) or ""), "event_not_found")
        finally:
            cleanup_mode()
            cleanup_home()

    def test_reply_upload_falls_back_to_single_enabled_actor_after_toggle_to_isolated(self) -> None:
        from cccc.contracts.v1 import DaemonRequest
        from cccc.daemon.server import handle_request

        _, cleanup_home = self._with_home()
        try:
            create_resp, _ = handle_request(
                DaemonRequest.model_validate(
                    {"op": "group_create", "args": {"title": "reply-upload-isolated", "topic": "", "mode": "collaboration", "by": "user"}}
                )
            )
            self.assertTrue(create_resp.ok, getattr(create_resp, "error", None))
            group_id = str((create_resp.result or {}).get("group_id") or "")

            with tempfile.TemporaryDirectory(prefix="cccc_reply_upload_scope_") as scope_dir_raw:
                scope_dir = Path(scope_dir_raw)
                attach_resp, _ = handle_request(
                    DaemonRequest.model_validate(
                        {"op": "attach", "args": {"group_id": group_id, "path": str(scope_dir), "by": "user"}}
                    )
                )
                self.assertTrue(attach_resp.ok, getattr(attach_resp, "error", None))

                use_resp, _ = handle_request(
                    DaemonRequest.model_validate(
                        {"op": "group_use", "args": {"group_id": group_id, "path": str(scope_dir), "by": "user"}}
                    )
                )
                self.assertTrue(use_resp.ok, getattr(use_resp, "error", None))

                add_resp, _ = handle_request(
                    DaemonRequest.model_validate(
                        {
                            "op": "actor_add",
                            "args": {
                                "group_id": group_id,
                                "actor_id": "peer1",
                                "title": "peer1",
                                "runtime": "codex",
                                "runner": "headless",
                                "by": "user",
                            },
                        }
                    )
                )
                self.assertTrue(add_resp.ok, getattr(add_resp, "error", None))

                send_resp, _ = handle_request(
                    DaemonRequest.model_validate(
                        {"op": "send", "args": {"group_id": group_id, "by": "user", "to": ["@all"], "text": "hello"}}
                    )
                )
                self.assertTrue(send_resp.ok, getattr(send_resp, "error", None))
                reply_to = str((((send_resp.result or {}).get("event")) or {}).get("id") or "")
                self.assertTrue(reply_to)

                toggle_resp, _ = handle_request(
                    DaemonRequest.model_validate(
                        {
                            "op": "group_settings_update",
                            "args": {"group_id": group_id, "by": "user", "patch": {"agent_link_mode": "isolated"}},
                        }
                    )
                )
                self.assertTrue(toggle_resp.ok, getattr(toggle_resp, "error", None))

                def fake_call_daemon(req: dict) -> dict:
                    self.assertEqual(str(req.get("op") or ""), "reply")
                    args = req.get("args") if isinstance(req.get("args"), dict) else {}
                    self.assertEqual(list((args or {}).get("to") or []), ["peer1"])
                    return {
                        "ok": True,
                        "result": {
                            "event": {
                                "id": "evt_reply_upload",
                                "kind": "chat.message",
                                "data": {
                                    "to": ["peer1"],
                                    "text": "reply after toggle",
                                },
                            }
                        },
                    }

                with patch("cccc.ports.web.app.call_daemon", side_effect=fake_call_daemon):
                    client = self._client()
                    resp = client.post(
                        f"/api/v1/groups/{group_id}/reply_upload",
                        data={"by": "user", "reply_to": reply_to, "text": "reply after toggle"},
                    )

                self.assertEqual(resp.status_code, 200)
                body = resp.json()
                self.assertTrue(bool(body.get("ok")))
                event = ((body.get("result") or {}).get("event")) if isinstance(body, dict) else {}
                data = event.get("data") if isinstance(event, dict) else {}
                self.assertEqual(list((data or {}).get("to") or []), ["peer1"])
        finally:
            cleanup_home()


if __name__ == "__main__":
    unittest.main()
