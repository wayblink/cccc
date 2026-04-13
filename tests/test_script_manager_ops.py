import os
import tempfile
import time
import unittest
from pathlib import Path


class TestScriptManagerOps(unittest.TestCase):
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

    def _call(self, op: str, args: dict):
        from cccc.contracts.v1 import DaemonRequest
        from cccc.daemon.server import handle_request

        return handle_request(DaemonRequest.model_validate({"op": op, "args": args}))

    def _create_script(
        self,
        *,
        name: str = "dev-server",
        command: str = "printf 'hello\\n'",
        cwd: str = ".",
        env: dict | None = None,
        kind: str = "service",
    ):
        resp, _ = self._call(
            "script_create",
            {
                "name": name,
                "kind": kind,
                "command": command,
                "cwd": cwd,
                "env": env or {},
                "by": "user",
            },
        )
        self.assertTrue(resp.ok, getattr(resp, "error", None))
        script = (resp.result or {}).get("script") or {}
        return str(script.get("id") or "")

    def _get_script(self, script_id: str):
        resp, _ = self._call("script_get", {"script_id": script_id, "by": "user"})
        self.assertTrue(resp.ok, getattr(resp, "error", None))
        return resp

    def _wait_for_runtime_status(self, script_id: str, *, expected: set[str], timeout_s: float = 5.0):
        deadline = time.time() + timeout_s
        last_resp = None
        while time.time() < deadline:
            last_resp = self._get_script(script_id)
            runtime = ((last_resp.result or {}).get("runtime") or {})
            if str(runtime.get("status") or "") in expected:
                return last_resp
            time.sleep(0.05)
        self.fail(f"script {script_id} did not reach statuses {expected}; last={getattr(last_resp, 'result', None)}")

    def test_script_crud_roundtrip(self) -> None:
        home, cleanup = self._with_home()
        try:
            workspace = Path(home) / "workspace"
            workspace.mkdir(parents=True, exist_ok=True)

            script_id = self._create_script(
                name="web-dev",
                kind="task",
                command="printf 'booted\\n'",
                cwd=str(workspace),
                env={"APP_ENV": "dev"},
            )
            self.assertTrue(script_id)

            fetched = self._get_script(script_id)
            script = (fetched.result or {}).get("script") or {}
            runtime = (fetched.result or {}).get("runtime") or {}
            self.assertEqual(script.get("name"), "web-dev")
            self.assertEqual(script.get("kind"), "task")
            self.assertEqual(script.get("command"), "printf 'booted\\n'")
            self.assertEqual(script.get("cwd"), str(workspace))
            self.assertEqual((script.get("env") or {}).get("APP_ENV"), "dev")
            self.assertEqual(runtime.get("status"), "idle")

            listed, _ = self._call("script_list", {"by": "user"})
            self.assertTrue(listed.ok, getattr(listed, "error", None))
            scripts = (listed.result or {}).get("scripts") or []
            match = next((item for item in scripts if str(item.get("id") or "") == script_id), None)
            self.assertIsNotNone(match)
            self.assertEqual((match or {}).get("name"), "web-dev")

            updated, _ = self._call(
                "script_update",
                {
                    "script_id": script_id,
                    "name": "web-dev-updated",
                    "kind": "service",
                    "command": "printf 'updated\\n'",
                    "cwd": str(workspace),
                    "env": {"APP_ENV": "staging"},
                    "by": "user",
                },
            )
            self.assertTrue(updated.ok, getattr(updated, "error", None))
            updated_script = (updated.result or {}).get("script") or {}
            self.assertEqual(updated_script.get("name"), "web-dev-updated")
            self.assertEqual(updated_script.get("kind"), "service")
            self.assertEqual((updated_script.get("env") or {}).get("APP_ENV"), "staging")

            deleted, _ = self._call("script_delete", {"script_id": script_id, "by": "user"})
            self.assertTrue(deleted.ok, getattr(deleted, "error", None))

            missing, _ = self._call("script_get", {"script_id": script_id, "by": "user"})
            self.assertFalse(missing.ok)
            self.assertEqual(getattr(missing.error, "code", ""), "script_not_found")

            state_path = Path(home) / "state" / "scripts" / "scripts.json"
            self.assertTrue(state_path.exists())
        finally:
            cleanup()

    def test_script_run_saves_latest_output_and_env(self) -> None:
        home, cleanup = self._with_home()
        try:
            workspace = Path(home) / "workspace"
            workspace.mkdir(parents=True, exist_ok=True)
            script_id = self._create_script(
                name="env-check",
                command="printf 'cwd=%s env=%s\\n' \"$PWD\" \"$APP_ENV\"",
                cwd=str(workspace),
                env={"APP_ENV": "dev"},
            )

            run, _ = self._call("script_run", {"script_id": script_id, "by": "user"})
            self.assertTrue(run.ok, getattr(run, "error", None))
            self.assertEqual(((run.result or {}).get("runtime") or {}).get("status"), "running")

            finished = self._wait_for_runtime_status(script_id, expected={"idle"}, timeout_s=5.0)
            last_output = (finished.result or {}).get("last_output") or {}
            self.assertEqual(last_output.get("result"), "success")
            text = str(last_output.get("text") or "")
            self.assertIn(f"cwd={workspace}", text)
            self.assertIn("env=dev", text)

            attach, _ = self._call("script_attach", {"script_id": script_id, "by": "user"})
            self.assertTrue(attach.ok, getattr(attach, "error", None))
            output = (attach.result or {}).get("output") or {}
            self.assertEqual(output.get("result"), "success")
            self.assertIn("env=dev", str(output.get("text") or ""))

            output_path = Path(home) / "state" / "scripts" / "last_outputs" / f"{script_id}.json"
            self.assertTrue(output_path.exists())
        finally:
            cleanup()

    def test_script_single_instance_stop_and_restart(self) -> None:
        _, cleanup = self._with_home()
        try:
            script_id = self._create_script(
                name="watcher",
                command="printf 'ready\\n'; sleep 30; printf 'done\\n'",
                cwd=".",
            )

            started, _ = self._call("script_run", {"script_id": script_id, "by": "user"})
            self.assertTrue(started.ok, getattr(started, "error", None))
            self._wait_for_runtime_status(script_id, expected={"running"}, timeout_s=2.0)

            second_run, _ = self._call("script_run", {"script_id": script_id, "by": "user"})
            self.assertFalse(second_run.ok)
            self.assertEqual(getattr(second_run.error, "code", ""), "script_already_running")

            stopped, _ = self._call("script_stop", {"script_id": script_id, "by": "user"})
            self.assertTrue(stopped.ok, getattr(stopped, "error", None))
            stopped_detail = self._wait_for_runtime_status(script_id, expected={"idle"}, timeout_s=5.0)
            stopped_output = (stopped_detail.result or {}).get("last_output") or {}
            self.assertEqual(stopped_output.get("result"), "stopped")
            self.assertIn("ready", str(stopped_output.get("text") or ""))
            self.assertNotIn("done", str(stopped_output.get("text") or ""))

            restarted, _ = self._call("script_restart", {"script_id": script_id, "by": "user"})
            self.assertTrue(restarted.ok, getattr(restarted, "error", None))
            self._wait_for_runtime_status(script_id, expected={"running"}, timeout_s=2.0)

            attach, _ = self._call("script_attach", {"script_id": script_id, "by": "user"})
            self.assertTrue(attach.ok, getattr(attach, "error", None))
            self.assertEqual(((attach.result or {}).get("runtime") or {}).get("status"), "running")
            self.assertIn("ready", str(((attach.result or {}).get("output") or {}).get("text") or ""))

            self._call("script_stop", {"script_id": script_id, "by": "user"})
            self._wait_for_runtime_status(script_id, expected={"idle"}, timeout_s=5.0)
        finally:
            cleanup()


if __name__ == "__main__":
    unittest.main()
