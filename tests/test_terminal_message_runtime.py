import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch


class TestTerminalMessageRuntime(unittest.TestCase):
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

    def test_contract_models_reject_unknown_fields(self) -> None:
        from pydantic import ValidationError

        from cccc.contracts.v1.terminal_runtime import RunEvent

        with self.assertRaises(ValidationError):
            RunEvent.model_validate(
                {
                    "group_id": "g1",
                    "actor_id": "coder",
                    "port_id": "port-1",
                    "run_id": "run-1",
                    "type": "progress",
                    "text": "working",
                    "unknown": True,
                }
            )

    def test_store_persists_port_run_events_and_resume_state(self) -> None:
        home, cleanup = self._with_home()
        try:
            from pathlib import Path

            from cccc.daemon.terminal_message_runtime import TerminalMessageRuntimeStore

            store = TerminalMessageRuntimeStore(Path(home))
            port = store.upsert_port(
                group_id="g1",
                actor_id="coder",
                runtime="codex",
                transport="pty",
                provider="codex",
                native_session_id="codex-session-1",
                cwd="/tmp/project",
                command=["codex"],
            )
            run = store.start_run(group_id="g1", actor_id="coder", port_id=port.id, input_text="implement it")
            first = store.append_event(
                group_id="g1",
                actor_id="coder",
                port_id=port.id,
                run_id=run.id,
                type="progress",
                text="reading files",
            )
            second = store.complete_run(
                group_id="g1",
                actor_id="coder",
                port_id=port.id,
                run_id=run.id,
                final_text="done",
                final_message_event_id="chat-event-1",
                status="completed",
            )

            self.assertEqual(first.seq, 1)
            self.assertEqual(second.seq, 2)

            reloaded = TerminalMessageRuntimeStore(Path(home))
            saved_run = reloaded.get_run("g1", run.id)
            self.assertEqual(saved_run.status, "completed")
            self.assertEqual(saved_run.final_message_event_id, "chat-event-1")
            self.assertEqual(saved_run.resume_state.native_session_id, "codex-session-1")

            events = reloaded.tail_events("g1", run.id, after_seq=0, limit=20)
            self.assertEqual([event.type for event in events], ["progress", "final"])
            self.assertEqual(events[-1].text, "done")
        finally:
            cleanup()

    def test_store_records_pty_output_as_raw_output_events(self) -> None:
        home, cleanup = self._with_home()
        try:
            from pathlib import Path

            from cccc.daemon.terminal_message_runtime import TerminalMessageRuntimeStore

            store = TerminalMessageRuntimeStore(Path(home))
            port, run = store.start_pty_run(
                group_id="g1",
                actor_id="coder",
                runtime="codex",
                provider="codex",
                cwd="/tmp/project",
                command=["codex"],
            )

            event = store.append_pty_output(
                group_id="g1",
                actor_id="coder",
                port_id=port.id,
                run_id=run.id,
                chunk=b"\x1b[32mworking\x1b[0m\n",
            )

            self.assertEqual(event.type, "raw_output")
            self.assertEqual(event.text, "\x1b[32mworking\x1b[0m\n")
            self.assertEqual(event.data.get("byte_count"), len(b"\x1b[32mworking\x1b[0m\n"))
        finally:
            cleanup()

    def test_actor_pty_start_wires_output_to_runtime_events(self) -> None:
        home, cleanup = self._with_home()
        try:
            from pathlib import Path

            from cccc.daemon.actors import actor_runtime_ops
            from cccc.daemon.terminal_message_runtime import TerminalMessageRuntimeStore

            group = SimpleNamespace(
                group_id="g1",
                doc={"active_scope_key": "scope1"},
                save=lambda: None,
                ledger_path=str(Path(home) / "ledger.jsonl"),
            )
            actor = {
                "id": "coder",
                "default_scope_key": "scope1",
                "runner": "pty",
                "runtime": "codex",
                "command": ["codex"],
                "env": {},
            }
            started = {}

            class _Supervisor:
                def start_actor(self, **kwargs):
                    started.update(kwargs)
                    return SimpleNamespace(pid=1234)

            with patch.object(actor_runtime_ops, "find_actor", return_value=actor), patch.object(
                actor_runtime_ops,
                "runtime_start_preflight_error",
                return_value=None,
            ), patch.object(actor_runtime_ops.pty_runner, "PTY_SUPPORTED", True), patch.object(
                actor_runtime_ops.pty_runner,
                "SUPERVISOR",
                _Supervisor(),
            ), patch.object(
                actor_runtime_ops,
                "append_event",
                return_value={"id": "actor-start-event"},
            ), patch.object(
                actor_runtime_ops,
                "request_pet_review",
                return_value=None,
            ):
                result = actor_runtime_ops.start_actor_process(
                    group,
                    "coder",
                    command=["codex"],
                    env={},
                    runner="pty",
                    runtime="codex",
                    by="user",
                    find_scope_url=lambda _group, _scope_key: ".",
                    effective_runner_kind=lambda runner: runner,
                    merge_actor_env_with_private=lambda _gid, _aid, env: dict(env),
                    normalize_runtime_command=lambda _runtime, command: list(command),
                    ensure_mcp_installed=lambda _runtime, _cwd, **_kwargs: True,
                    inject_actor_context_env=lambda env, _gid, _aid: dict(env),
                    prepare_pty_env=lambda env: dict(env),
                    pty_backlog_bytes=lambda: 1024,
                    write_headless_state=lambda _gid, _aid: None,
                    write_pty_state=lambda _gid, _aid, _pid: None,
                    clear_preamble_sent=lambda _group, _aid: None,
                    throttle_reset_actor=lambda _gid, _aid: None,
                    supported_runtimes=("codex",),
                )

            self.assertTrue(result.get("success"), result.get("error"))
            output_callback = started.get("on_output")
            self.assertTrue(callable(output_callback))
            output_callback(SimpleNamespace(), b"streamed progress\n")

            store = TerminalMessageRuntimeStore(Path(home))
            run_files = sorted((Path(home) / "groups" / "g1" / "state" / "terminal_runtime" / "runs").glob("*.json"))
            self.assertEqual(len(run_files), 1)
            run_id = run_files[0].stem
            events = store.tail_events("g1", run_id, after_seq=0, limit=10)
            self.assertEqual([event.type for event in events], ["raw_output"])
            self.assertEqual(events[0].text, "streamed progress\n")
        finally:
            cleanup()

    def test_daemon_terminal_runtime_ops_roundtrip(self) -> None:
        _, cleanup = self._with_home()
        try:
            port_resp, _ = self._call(
                "terminal_runtime_port_upsert",
                {
                    "group_id": "g1",
                    "actor_id": "coder",
                    "runtime": "claude",
                    "transport": "pty",
                    "provider": "claude",
                    "native_session_id": "claude-session-1",
                    "cwd": "/tmp/project",
                    "command": ["claude"],
                },
            )
            self.assertTrue(port_resp.ok, getattr(port_resp, "error", None))
            port = (port_resp.result or {}).get("port") or {}
            port_id = str(port.get("id") or "")
            self.assertTrue(port_id)

            run_resp, _ = self._call(
                "terminal_runtime_run_start",
                {"group_id": "g1", "actor_id": "coder", "port_id": port_id, "input_text": "build feature"},
            )
            self.assertTrue(run_resp.ok, getattr(run_resp, "error", None))
            run_id = str(((run_resp.result or {}).get("run") or {}).get("id") or "")
            self.assertTrue(run_id)

            event_resp, _ = self._call(
                "terminal_runtime_event_append",
                {
                    "group_id": "g1",
                    "actor_id": "coder",
                    "port_id": port_id,
                    "run_id": run_id,
                    "type": "progress",
                    "text": "running tests",
                },
            )
            self.assertTrue(event_resp.ok, getattr(event_resp, "error", None))
            self.assertEqual(int(((event_resp.result or {}).get("event") or {}).get("seq") or 0), 1)

            final_resp, _ = self._call(
                "terminal_runtime_run_complete",
                {
                    "group_id": "g1",
                    "actor_id": "coder",
                    "port_id": port_id,
                    "run_id": run_id,
                    "status": "completed",
                    "final_text": "implemented",
                    "final_message_event_id": "chat-event-2",
                },
            )
            self.assertTrue(final_resp.ok, getattr(final_resp, "error", None))

            tail_resp, _ = self._call(
                "terminal_runtime_run_tail",
                {"group_id": "g1", "run_id": run_id, "after_seq": 0, "limit": 10},
            )
            self.assertTrue(tail_resp.ok, getattr(tail_resp, "error", None))
            events = ((tail_resp.result or {}).get("events") or [])
            self.assertEqual([event.get("type") for event in events], ["progress", "final"])
            self.assertEqual([event.get("seq") for event in events], [1, 2])
        finally:
            cleanup()


if __name__ == "__main__":
    unittest.main()
