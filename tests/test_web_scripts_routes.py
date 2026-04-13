import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


class TestWebScriptsRoutes(unittest.TestCase):
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

    def _local_call_daemon(self, req: dict):
        from cccc.contracts.v1 import DaemonRequest
        from cccc.daemon.server import handle_request

        resp, _ = handle_request(DaemonRequest.model_validate(req))
        return resp.model_dump(exclude_none=True)

    def _wait_for_idle(self, client: TestClient, script_id: str, *, timeout_s: float = 5.0) -> dict:
        deadline = time.time() + timeout_s
        last = {}
        while time.time() < deadline:
            resp = client.get(f"/api/v1/scripts/{script_id}")
            self.assertEqual(resp.status_code, 200)
            last = resp.json()
            runtime = ((last.get("result") or {}).get("runtime") or {})
            if str(runtime.get("status") or "") == "idle":
                return last
            time.sleep(0.05)
        self.fail(f"script did not become idle: {last}")

    def test_scripts_crud_routes_roundtrip(self) -> None:
        home, cleanup = self._with_home()
        try:
            workspace = Path(home) / "workspace"
            workspace.mkdir(parents=True, exist_ok=True)
            with patch("cccc.ports.web.app.call_daemon", side_effect=self._local_call_daemon):
                client = self._client()

                created = client.post(
                    "/api/v1/scripts",
                    json={
                        "name": "web-dev",
                        "kind": "task",
                        "command": "printf 'booted\\n'",
                        "cwd": str(workspace),
                        "env": {"APP_ENV": "dev"},
                    },
                )
                self.assertEqual(created.status_code, 200)
                created_body = created.json()
                self.assertTrue(created_body.get("ok"))
                script_id = str((((created_body.get("result") or {}).get("script")) or {}).get("id") or "")
                self.assertTrue(script_id)

                listed = client.get("/api/v1/scripts")
                self.assertEqual(listed.status_code, 200)
                items = ((listed.json().get("result") or {}).get("scripts")) or []
                self.assertEqual(len(items), 1)
                self.assertEqual(items[0].get("name"), "web-dev")
                self.assertEqual(items[0].get("kind"), "task")

                fetched = client.get(f"/api/v1/scripts/{script_id}")
                self.assertEqual(fetched.status_code, 200)
                self.assertEqual((((fetched.json().get("result") or {}).get("script")) or {}).get("cwd"), str(workspace))

                updated = client.put(
                    f"/api/v1/scripts/{script_id}",
                    json={
                        "name": "web-dev-updated",
                        "kind": "service",
                        "command": "printf 'updated\\n'",
                        "cwd": str(workspace),
                        "env": {"APP_ENV": "staging"},
                    },
                )
                self.assertEqual(updated.status_code, 200)
                self.assertTrue(updated.json().get("ok"))
                updated_script = ((updated.json().get("result") or {}).get("script")) or {}
                self.assertEqual(updated_script.get("name"), "web-dev-updated")
                self.assertEqual(updated_script.get("kind"), "service")

                deleted = client.delete(f"/api/v1/scripts/{script_id}")
                self.assertEqual(deleted.status_code, 200)
                self.assertTrue(deleted.json().get("ok"))

                missing = client.get(f"/api/v1/scripts/{script_id}")
                self.assertEqual(missing.status_code, 200)
                self.assertFalse(missing.json().get("ok"))
                self.assertEqual(str((missing.json().get("error") or {}).get("code") or ""), "script_not_found")
        finally:
            cleanup()

    def test_scripts_run_attach_and_restart_routes(self) -> None:
        _, cleanup = self._with_home()
        try:
            with patch("cccc.ports.web.app.call_daemon", side_effect=self._local_call_daemon):
                client = self._client()

                created = client.post(
                    "/api/v1/scripts",
                    json={
                        "name": "watcher",
                        "command": "printf 'ready\\n'; sleep 30; printf 'done\\n'",
                        "cwd": ".",
                        "env": {},
                    },
                )
                script_id = str((((created.json().get("result") or {}).get("script")) or {}).get("id") or "")
                self.assertTrue(script_id)

                started = client.post(f"/api/v1/scripts/{script_id}/run")
                self.assertEqual(started.status_code, 200)
                self.assertTrue(started.json().get("ok"))
                self.assertEqual((((started.json().get("result") or {}).get("runtime")) or {}).get("status"), "running")

                attached = client.get(f"/api/v1/scripts/{script_id}/attach")
                self.assertEqual(attached.status_code, 200)
                self.assertTrue(attached.json().get("ok"))
                self.assertIn("ready", str(((attached.json().get("result") or {}).get("output") or {}).get("text") or ""))

                stopped = client.post(f"/api/v1/scripts/{script_id}/stop")
                self.assertEqual(stopped.status_code, 200)
                self.assertTrue(stopped.json().get("ok"))
                idle = self._wait_for_idle(client, script_id)
                self.assertEqual((((idle.get("result") or {}).get("last_output")) or {}).get("result"), "stopped")

                restarted = client.post(f"/api/v1/scripts/{script_id}/restart")
                self.assertEqual(restarted.status_code, 200)
                self.assertTrue(restarted.json().get("ok"))
                self.assertEqual((((restarted.json().get("result") or {}).get("runtime")) or {}).get("status"), "running")

                attached_again = client.get(f"/api/v1/scripts/{script_id}/attach")
                self.assertEqual(attached_again.status_code, 200)
                self.assertIn("ready", str(((attached_again.json().get("result") or {}).get("output") or {}).get("text") or ""))

                client.post(f"/api/v1/scripts/{script_id}/stop")
                self._wait_for_idle(client, script_id)
        finally:
            cleanup()


if __name__ == "__main__":
    unittest.main()
