import os
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from unittest.mock import patch


class TestAgentLinkModeIsolation(unittest.TestCase):
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

    def _create_group(self, *, title: str, mode: str = "interactive") -> str:
        resp, _ = self._call("group_create", {"title": title, "topic": "", "mode": mode, "by": "user"})
        self.assertTrue(resp.ok, getattr(resp, "error", None))
        group_id = str((resp.result or {}).get("group_id") or "").strip()
        self.assertTrue(group_id)
        return group_id

    def _add_headless_actor(self, *, group_id: str, actor_id: str) -> None:
        resp, _ = self._call(
            "actor_add",
            {
                "group_id": group_id,
                "actor_id": actor_id,
                "title": actor_id,
                "runtime": "codex",
                "runner": "headless",
                "by": "user",
            },
        )
        self.assertTrue(resp.ok, getattr(resp, "error", None))

    def _create_kernel_group(self, *, title: str, mode: str = "interactive"):
        from cccc.kernel.group import create_group
        from cccc.kernel.registry import load_registry

        reg = load_registry()
        return create_group(reg, title=title, mode=mode)

    def _append_actor(self, group, *, actor_id: str, runner: str = "pty", enabled: bool = True) -> None:
        from cccc.kernel.actors import add_actor

        add_actor(group, actor_id=actor_id, runtime="codex", runner=runner, enabled=enabled)

    def _ledger_events(self, group) -> list[dict]:
        import json

        lines = [line for line in group.ledger_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return [json.loads(line) for line in lines]

    def _automation_state(self, group) -> dict:
        import json

        path = group.path / "state" / "automation.json"
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def test_connected_group_keeps_actor_to_actor_visible_chat(self) -> None:
        _, cleanup = self._with_home()
        try:
            group_id = self._create_group(title="connected-chat", mode="collaboration")
            self._add_headless_actor(group_id=group_id, actor_id="peer1")
            self._add_headless_actor(group_id=group_id, actor_id="peer2")

            send_resp, _ = self._call(
                "send",
                {
                    "group_id": group_id,
                    "by": "peer1",
                    "to": ["peer2"],
                    "text": "hello from peer1",
                },
            )
            self.assertTrue(send_resp.ok, getattr(send_resp, "error", None))
            event = (send_resp.result or {}).get("event") if isinstance(send_resp.result, dict) else {}
            self.assertIsInstance(event, dict)
            self.assertEqual(str(((event.get("data") or {}).get("to") or [None])[0] or ""), "peer2")
        finally:
            cleanup()

    def test_isolated_group_blocks_actor_to_actor_chat_and_notify(self) -> None:
        _, cleanup = self._with_home()
        try:
            group_id = self._create_group(title="isolated-chat", mode="interactive")
            self._add_headless_actor(group_id=group_id, actor_id="peer1")
            self._add_headless_actor(group_id=group_id, actor_id="peer2")

            send_resp, _ = self._call(
                "send",
                {
                    "group_id": group_id,
                    "by": "peer1",
                    "to": ["peer2"],
                    "text": "should be blocked",
                },
            )
            self.assertFalse(send_resp.ok)
            self.assertEqual(getattr(send_resp.error, "code", ""), "peer_messaging_disabled")

            notify_resp, _ = self._call(
                "system_notify",
                {
                    "group_id": group_id,
                    "by": "peer1",
                    "kind": "info",
                    "title": "blocked",
                    "message": "no peer notify",
                    "target_actor_id": "peer2",
                },
            )
            self.assertFalse(notify_resp.ok)
            self.assertEqual(getattr(notify_resp.error, "code", ""), "peer_messaging_disabled")
        finally:
            cleanup()

    def test_isolated_group_send_without_recipient_falls_back_to_single_enabled_actor(self) -> None:
        _, cleanup = self._with_home()
        try:
            group = self._create_kernel_group(title="isolated-single-send", mode="interactive")
            self._append_actor(group, actor_id="solo", runner="headless")

            send_resp, _ = self._call(
                "send",
                {
                    "group_id": group.group_id,
                    "by": "user",
                    "to": [],
                    "text": "hello solo",
                },
            )
            self.assertTrue(send_resp.ok, getattr(send_resp, "error", None))
            event = (send_resp.result or {}).get("event") if isinstance(send_resp.result, dict) else {}
            data = event.get("data") if isinstance(event, dict) else {}
            self.assertEqual(list((data or {}).get("to") or []), ["solo"])
        finally:
            cleanup()

    def test_isolated_group_send_without_recipient_still_requires_choice_with_multiple_enabled_actors(self) -> None:
        _, cleanup = self._with_home()
        try:
            group = self._create_kernel_group(title="isolated-multi-send", mode="interactive")
            self._append_actor(group, actor_id="peer1", runner="headless")
            self._append_actor(group, actor_id="peer2", runner="headless")

            send_resp, _ = self._call(
                "send",
                {
                    "group_id": group.group_id,
                    "by": "user",
                    "to": [],
                    "text": "who should get this",
                },
            )
            self.assertFalse(send_resp.ok)
            self.assertEqual(getattr(send_resp.error, "code", ""), "missing_recipient")
        finally:
            cleanup()

    def test_isolated_group_hides_coordination_and_tasks(self) -> None:
        _, cleanup = self._with_home()
        try:
            group_id = self._create_group(title="toggle-isolation", mode="collaboration")

            sync_resp, _ = self._call(
                "context_sync",
                {
                    "group_id": group_id,
                    "by": "user",
                    "ops": [
                        {"op": "coordination.brief.update", "objective": "Ship connected flow"},
                        {"op": "task.create", "title": "Prepare rollout", "status": "active"},
                    ],
                },
            )
            self.assertTrue(sync_resp.ok, getattr(sync_resp, "error", None))

            summary_resp, _ = self._call("context_get", {"group_id": group_id, "detail": "summary"})
            self.assertTrue(summary_resp.ok, getattr(summary_resp, "error", None))
            self.assertEqual(
                str((((summary_resp.result or {}).get("coordination") or {}).get("brief") or {}).get("objective") or ""),
                "Ship connected flow",
            )
            self.assertEqual(int((((summary_resp.result or {}).get("tasks_summary") or {}).get("total") or 0)), 1)

            settings_resp, _ = self._call(
                "group_settings_update",
                {"group_id": group_id, "by": "user", "patch": {"agent_link_mode": "isolated"}},
            )
            self.assertTrue(settings_resp.ok, getattr(settings_resp, "error", None))

            isolated_summary_resp, _ = self._call("context_get", {"group_id": group_id, "detail": "summary"})
            self.assertTrue(isolated_summary_resp.ok, getattr(isolated_summary_resp, "error", None))
            isolated_summary = isolated_summary_resp.result if isinstance(isolated_summary_resp.result, dict) else {}
            self.assertEqual(
                str((((isolated_summary.get("coordination") or {}).get("brief") or {}).get("objective") or "")),
                "",
            )
            self.assertEqual(list(((isolated_summary.get("coordination") or {}).get("tasks") or [])), [])
            self.assertEqual(int(((isolated_summary.get("tasks_summary") or {}).get("total") or 0)), 0)

            isolated_full_resp, _ = self._call("context_get", {"group_id": group_id, "detail": "full"})
            self.assertTrue(isolated_full_resp.ok, getattr(isolated_full_resp, "error", None))
            isolated_full = isolated_full_resp.result if isinstance(isolated_full_resp.result, dict) else {}
            self.assertEqual(
                str((((isolated_full.get("coordination") or {}).get("brief") or {}).get("objective") or "")),
                "",
            )
            self.assertEqual(list(((isolated_full.get("coordination") or {}).get("tasks") or [])), [])

            task_list_resp, _ = self._call("task_list", {"group_id": group_id})
            self.assertFalse(task_list_resp.ok)
            self.assertEqual(getattr(task_list_resp.error, "code", ""), "tool_unavailable")

            forbidden_sync_resp, _ = self._call(
                "context_sync",
                {
                    "group_id": group_id,
                    "by": "user",
                    "ops": [{"op": "coordination.brief.update", "objective": "Should fail"}],
                },
            )
            self.assertFalse(forbidden_sync_resp.ok)
            self.assertEqual(getattr(forbidden_sync_resp.error, "code", ""), "context_sync_error")
            self.assertIn("agent_link_mode=isolated", str(getattr(forbidden_sync_resp.error, "message", "")))
        finally:
            cleanup()

    def test_isolated_automation_stays_out_of_foreman_coordination_paths(self) -> None:
        from cccc.contracts.v1 import ChatMessageData
        from cccc.daemon.automation import AutomationManager, _cfg
        from cccc.kernel.ledger import append_event

        _, cleanup = self._with_home()
        try:
            group = self._create_kernel_group(title="isolated-automation", mode="interactive")
            self._append_actor(group, actor_id="foreman1")
            self._append_actor(group, actor_id="peer1")

            automation = group.doc.get("automation") if isinstance(group.doc.get("automation"), dict) else {}
            automation.update(
                {
                    "reply_required_nudge_after_seconds": 0,
                    "attention_ack_nudge_after_seconds": 0,
                    "unread_nudge_after_seconds": 0,
                    "nudge_digest_min_interval_seconds": 0,
                    "nudge_max_repeats_per_obligation": 10,
                    "nudge_escalate_after_repeats": 1,
                    "actor_idle_timeout_seconds": 1,
                    "silence_timeout_seconds": 1,
                    "help_nudge_interval_seconds": 1,
                    "help_nudge_min_messages": 1,
                }
            )
            group.doc["automation"] = automation
            group.save()

            msg = append_event(
                group.ledger_path,
                kind="chat.message",
                group_id=group.group_id,
                scope_key="",
                by="user",
                data=ChatMessageData(text="please reply", to=["peer1"], reply_required=True).model_dump(),
            )
            self.assertTrue(str(msg.get("id") or ""))

            manager = AutomationManager()
            cfg = _cfg(group)
            now = datetime.now(timezone.utc)

            with patch("cccc.daemon.automation.engine.pty_runner.SUPERVISOR.actor_running", return_value=True), patch(
                "cccc.daemon.automation.engine.pty_runner.SUPERVISOR.session_key",
                return_value="sess1",
            ), patch("cccc.daemon.automation.engine._queue_notify_to_pty", return_value=None):
                manager._check_nudge(group, cfg, now)
                manager._check_actor_idle(group, cfg, now + timedelta(seconds=2))
                manager._check_silence(group, cfg, now + timedelta(seconds=2))
                manager._check_help_nudge(group, cfg, now + timedelta(seconds=2))

            notify_events = [
                ev
                for ev in self._ledger_events(group)
                if str(ev.get("kind") or "") == "system.notify"
            ]
            self.assertTrue(notify_events)
            self.assertTrue(
                any(str(((ev.get("data") or {}).get("target_actor_id") or "")) == "peer1" for ev in notify_events)
            )
            self.assertFalse(
                any(str(((ev.get("data") or {}).get("target_actor_id") or "")) == "foreman1" for ev in notify_events)
            )
            self.assertFalse(
                any(
                    str(((ev.get("data") or {}).get("kind") or "")) in {"actor_idle", "silence_check", "auto_idle", "help_nudge"}
                    for ev in notify_events
                )
            )
        finally:
            cleanup()

    def test_isolated_replace_all_rules_rejects_selector_targets(self) -> None:
        _, cleanup = self._with_home()
        try:
            group_id = self._create_group(title="isolated-rules", mode="interactive")
            self._add_headless_actor(group_id=group_id, actor_id="peer1")

            resp, _ = self._call(
                "group_automation_manage",
                {
                    "group_id": group_id,
                    "by": "user",
                    "actions": [
                        {
                            "type": "replace_all_rules",
                            "ruleset": {
                                "rules": [
                                    {
                                        "id": "broadcast",
                                        "enabled": True,
                                        "scope": "group",
                                        "to": ["@all"],
                                        "trigger": {"kind": "interval", "every_seconds": 60},
                                        "action": {
                                            "kind": "notify",
                                            "priority": "normal",
                                            "title": "Broadcast",
                                            "message": "should fail",
                                        },
                                    }
                                ],
                                "snippets": {},
                            },
                        }
                    ],
                },
            )
            self.assertFalse(resp.ok)
            self.assertEqual(getattr(resp.error, "code", ""), "group_automation_manage_failed")
            self.assertIn("selector recipients", str(getattr(resp.error, "message", "")))
        finally:
            cleanup()

    def test_isolated_runtime_skips_legacy_selector_rules_after_toggle(self) -> None:
        from cccc.daemon.automation import AutomationManager
        from cccc.kernel.group import load_group

        _, cleanup = self._with_home()
        try:
            group_id = self._create_group(title="toggle-legacy-rules", mode="collaboration")
            self._add_headless_actor(group_id=group_id, actor_id="foreman1")
            self._add_headless_actor(group_id=group_id, actor_id="peer1")

            update_resp, _ = self._call(
                "group_automation_update",
                {
                    "group_id": group_id,
                    "by": "user",
                    "ruleset": {
                        "rules": [
                            {
                                "id": "legacy-broadcast",
                                "enabled": True,
                                "scope": "group",
                                "to": ["@all"],
                                "trigger": {"kind": "at", "at": "2026-04-23T00:00:00Z"},
                                "action": {
                                    "kind": "notify",
                                    "priority": "normal",
                                    "title": "Legacy selector notify",
                                    "message": "should not fire after toggle",
                                },
                            },
                            {
                                "id": "legacy-restart",
                                "enabled": True,
                                "scope": "group",
                                "trigger": {"kind": "at", "at": "2026-04-23T00:00:00Z"},
                                "action": {
                                    "kind": "actor_control",
                                    "operation": "restart",
                                    "targets": ["@all"],
                                },
                            },
                        ],
                        "snippets": {},
                    },
                },
            )
            self.assertTrue(update_resp.ok, getattr(update_resp, "error", None))

            settings_resp, _ = self._call(
                "group_settings_update",
                {"group_id": group_id, "by": "user", "patch": {"agent_link_mode": "isolated"}},
            )
            self.assertTrue(settings_resp.ok, getattr(settings_resp, "error", None))

            group = load_group(group_id)
            assert group is not None
            manager = AutomationManager()
            now = datetime(2026, 4, 23, 0, 1, tzinfo=timezone.utc)

            with patch("cccc.daemon.automation.engine.pty_runner.SUPERVISOR.actor_running", return_value=True), patch(
                "cccc.daemon.automation.engine.headless_runner.SUPERVISOR.actor_running",
                return_value=True,
            ), patch("cccc.daemon.automation.engine._queue_notify_to_pty", return_value=None), patch.object(
                AutomationManager,
                "_daemon_automation_call",
                return_value=(True, ""),
            ) as daemon_call_mock:
                manager._check_rules(group, now)

            self.assertFalse(daemon_call_mock.called)
            notify_events = [
                ev
                for ev in self._ledger_events(group)
                if str(ev.get("kind") or "") == "system.notify"
                and str(((ev.get("data") or {}).get("kind") or "")) == "automation"
            ]
            self.assertEqual(notify_events, [])

            state = self._automation_state(group)
            rules_state = state.get("rules") if isinstance(state.get("rules"), dict) else {}
            self.assertIn("selector recipients", str((rules_state.get("legacy-broadcast") or {}).get("last_error") or ""))
            self.assertIn("selector targets", str((rules_state.get("legacy-restart") or {}).get("last_error") or ""))
        finally:
            cleanup()

    def test_isolated_broadcast_notify_is_not_fanned_out_or_visible_in_actor_inbox(self) -> None:
        from cccc.contracts.v1 import SystemNotifyData
        from cccc.daemon.messaging.delivery import emit_system_notify
        from cccc.kernel.inbox import unread_messages

        _, cleanup = self._with_home()
        try:
            group = self._create_kernel_group(title="isolated-legacy-notify", mode="interactive")
            self._append_actor(group, actor_id="peer1")
            self._append_actor(group, actor_id="peer2")

            with patch("cccc.daemon.messaging.delivery.pty_runner.SUPERVISOR.actor_running", return_value=True), patch(
                "cccc.daemon.messaging.delivery.queue_system_notify"
            ) as queue_mock:
                emit_system_notify(
                    group,
                    by="system",
                    notify=SystemNotifyData(
                        kind="info",
                        priority="normal",
                        title="legacy broadcast",
                        message="should stay hidden",
                    ),
                )

            queue_mock.assert_not_called()
            self.assertEqual(unread_messages(group, actor_id="peer1", kind_filter="notify"), [])
            self.assertEqual(unread_messages(group, actor_id="peer2", kind_filter="notify"), [])
        finally:
            cleanup()

    def test_cli_fallback_send_still_blocks_actor_peer_chat_in_isolated_group(self) -> None:
        import argparse

        from cccc.cli import messaging_cmds

        _, cleanup = self._with_home()
        try:
            group = self._create_kernel_group(title="isolated-cli-send", mode="interactive")
            self._append_actor(group, actor_id="peer1")
            self._append_actor(group, actor_id="peer2")

            args = argparse.Namespace(
                group=group.group_id,
                to=["peer2"],
                text="should be blocked",
                by="peer1",
                path="",
                priority="normal",
                reply_required=False,
            )

            buf = io.StringIO()
            with patch("cccc.cli.messaging_cmds._ensure_daemon_running", return_value=False), redirect_stdout(buf):
                rc = messaging_cmds.cmd_send(args)

            self.assertEqual(rc, 2)
            payload = json.loads(buf.getvalue())
            self.assertEqual(str(((payload.get("error") or {}).get("code") or "")), "peer_messaging_disabled")
            self.assertEqual(
                [ev for ev in self._ledger_events(group) if str(ev.get("kind") or "") == "chat.message"],
                [],
            )
        finally:
            cleanup()


if __name__ == "__main__":
    unittest.main()
