import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import quote

import httpx
from fastapi.testclient import TestClient


class TestWebRemoteGroupRoutes(unittest.TestCase):
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

        return cleanup

    def _client(self) -> TestClient:
        from cccc.ports.web.app import create_app

        return TestClient(create_app())

    def test_groups_list_includes_configured_remote_group(self) -> None:
        from cccc.kernel.settings import update_remote_groups_settings

        cleanup = self._with_home()
        try:
            update_remote_groups_settings(
                [
                    {
                        "group_id": "g-remote",
                        "base_url": "http://127.0.0.1:18848",
                        "remote_group_id": "g-upstream",
                        "title": "Remote Group",
                        "topic": "upstream",
                        "enabled": True,
                    }
                ]
            )
            with self._client() as client:
                resp = client.get("/api/v1/groups")
            self.assertEqual(resp.status_code, 200)
            groups = (resp.json().get("result") or {}).get("groups") or []
            row = next((item for item in groups if str(item.get("group_id") or "") == "g-remote"), None)
            self.assertIsNotNone(row)
            self.assertEqual(str((row or {}).get("remote", {}).get("remote_group_id") or ""), "g-upstream")
        finally:
            cleanup()

    def test_group_route_is_proxied_for_remote_group_mapping(self) -> None:
        from cccc.kernel.access_tokens import create_access_token
        from cccc.kernel.settings import update_remote_groups_settings

        cleanup = self._with_home()
        try:
            update_remote_groups_settings(
                [
                    {
                        "group_id": "g-remote",
                        "base_url": "http://remote-host:18848",
                        "remote_group_id": "g-upstream",
                        "access_token": "remote-token",
                        "enabled": True,
                    }
                ]
            )
            created = create_access_token("admin-user", is_admin=True)
            token = str(created.get("token") or "")
            sent: dict[str, str] = {}

            async def _fake_send(self, request: httpx.Request, *, stream: bool = False, auth=None, follow_redirects=None):
                sent["url"] = str(request.url)
                sent["authorization"] = str(request.headers.get("authorization") or "")
                return httpx.Response(
                    200,
                    json={"ok": True, "result": {"group": {"group_id": "g-upstream"}}},
                    headers={"content-type": "application/json"},
                    request=request,
                )

            with patch("cccc.ports.web.middleware.httpx.AsyncClient.send", new=_fake_send):
                with self._client() as client:
                    resp = client.get(
                        "/api/v1/groups/g-remote?include=detail",
                        headers={"Authorization": f"Bearer {token}"},
                    )

            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertTrue(bool(body.get("ok")), body)
            self.assertEqual(sent.get("url"), "http://remote-host:18848/api/v1/groups/g-upstream?include=detail")
            self.assertEqual(sent.get("authorization"), "Bearer remote-token")
        finally:
            cleanup()

    def test_remote_groups_admin_crud_routes(self) -> None:
        from cccc.kernel.access_tokens import create_access_token

        cleanup = self._with_home()
        try:
            created = create_access_token("admin-user", is_admin=True)
            token = str(created.get("token") or "")
            headers = {"Authorization": f"Bearer {token}"}

            with self._client() as client:
                upsert_resp = client.post(
                    "/api/v1/remote_groups",
                    headers=headers,
                    json={
                        "group_id": "g-remote",
                        "base_url": "http://127.0.0.1:18848",
                        "remote_group_id": "g-upstream",
                        "enabled": True,
                    },
                )
                self.assertEqual(upsert_resp.status_code, 200)

                get_resp = client.get("/api/v1/remote_groups", headers=headers)
                self.assertEqual(get_resp.status_code, 200)
                rows = (get_resp.json().get("result") or {}).get("groups") or []
                self.assertEqual(len(rows), 1)

                delete_resp = client.delete("/api/v1/remote_groups/g-remote", headers=headers)
                self.assertEqual(delete_resp.status_code, 200)
                rows_after = (delete_resp.json().get("result") or {}).get("groups") or []
                self.assertEqual(rows_after, [])
        finally:
            cleanup()

    def test_remote_backends_admin_crud_routes(self) -> None:
        from cccc.kernel.access_tokens import create_access_token

        cleanup = self._with_home()
        try:
            created = create_access_token("admin-user", is_admin=True)
            token = str(created.get("token") or "")
            headers = {"Authorization": f"Bearer {token}"}

            with self._client() as client:
                upsert_resp = client.post(
                    "/api/v1/remote_backends",
                    headers=headers,
                    json={
                        "backend_id": "dev",
                        "base_url": "http://127.0.0.1:18848",
                        "access_token": "token-1",
                        "enabled": True,
                    },
                )
                self.assertEqual(upsert_resp.status_code, 200)

                get_resp = client.get("/api/v1/remote_backends", headers=headers)
                self.assertEqual(get_resp.status_code, 200)
                rows = (get_resp.json().get("result") or {}).get("backends") or []
                self.assertEqual(len(rows), 1)
                self.assertEqual(str(rows[0].get("backend_id") or ""), "dev")

                delete_resp = client.delete("/api/v1/remote_backends/dev", headers=headers)
                self.assertEqual(delete_resp.status_code, 200)
                rows_after = (delete_resp.json().get("result") or {}).get("backends") or []
                self.assertEqual(rows_after, [])
        finally:
            cleanup()

    def test_groups_list_includes_remote_backend_groups(self) -> None:
        from cccc.kernel.settings import update_remote_backends_settings

        cleanup = self._with_home()
        try:
            update_remote_backends_settings(
                [
                    {
                        "backend_id": "prod",
                        "base_url": "http://remote-host:18848",
                        "access_token": "remote-token",
                        "enabled": True,
                    }
                ]
            )

            class _FakeRemoteClient:
                def __init__(self, *args, **kwargs):
                    pass

                def __enter__(self):
                    return self

                def __exit__(self, exc_type, exc, tb):
                    return False

                def get(self, url: str, *, headers=None, **kwargs):
                    assert url == "http://remote-host:18848/api/v1/groups"
                    assert str((headers or {}).get("Authorization") or "") == "Bearer remote-token"
                    return httpx.Response(
                        200,
                        json={"ok": True, "result": {"groups": [{"group_id": "g-upstream", "title": "Upstream"}]}},
                        request=httpx.Request("GET", url),
                    )

            with patch("cccc.ports.web.routes.groups.httpx.Client", new=_FakeRemoteClient):
                with self._client() as client:
                    resp = client.get("/api/v1/groups")

            self.assertEqual(resp.status_code, 200)
            groups = (resp.json().get("result") or {}).get("groups") or []
            row = next((item for item in groups if str(item.get("group_id") or "") == "remote:prod:g-upstream"), None)
            self.assertIsNotNone(row)
            self.assertEqual(str((row or {}).get("remote", {}).get("remote_group_id") or ""), "g-upstream")
            self.assertEqual(str((row or {}).get("remote", {}).get("backend_id") or ""), "prod")
        finally:
            cleanup()

    def test_group_route_is_proxied_for_remote_backend_virtual_group(self) -> None:
        from cccc.kernel.access_tokens import create_access_token
        from cccc.kernel.settings import update_remote_backends_settings

        cleanup = self._with_home()
        try:
            update_remote_backends_settings(
                [
                    {
                        "backend_id": "prod",
                        "base_url": "http://remote-host:18848",
                        "access_token": "remote-token",
                        "enabled": True,
                    }
                ]
            )
            created = create_access_token("admin-user", is_admin=True)
            token = str(created.get("token") or "")
            sent: dict[str, str] = {}
            remote_group_id = "g/upstream+v2"
            virtual_group_id = f"remote:prod:{quote(remote_group_id, safe='')}"

            async def _fake_send(self, request: httpx.Request, *, stream: bool = False, auth=None, follow_redirects=None):
                sent["url"] = str(request.url)
                sent["authorization"] = str(request.headers.get("authorization") or "")
                return httpx.Response(
                    200,
                    json={"ok": True, "result": {"group": {"group_id": remote_group_id}}},
                    headers={"content-type": "application/json"},
                    request=request,
                )

            with patch("cccc.ports.web.middleware.httpx.AsyncClient.send", new=_fake_send):
                with self._client() as client:
                    resp = client.get(
                        f"/api/v1/groups/{virtual_group_id}?include=detail",
                        headers={"Authorization": f"Bearer {token}"},
                    )

            self.assertEqual(resp.status_code, 200)
            self.assertEqual(
                sent.get("url"),
                "http://remote-host:18848/api/v1/groups/g/upstream+v2?include=detail",
            )
            self.assertEqual(sent.get("authorization"), "Bearer remote-token")
        finally:
            cleanup()

    def test_remote_backend_groups_read_and_create_routes(self) -> None:
        from cccc.kernel.access_tokens import create_access_token
        from cccc.kernel.settings import update_remote_backends_settings

        cleanup = self._with_home()
        try:
            update_remote_backends_settings(
                [
                    {
                        "backend_id": "prod",
                        "base_url": "http://remote-host:18848",
                        "access_token": "remote-token",
                        "enabled": True,
                    }
                ]
            )
            created = create_access_token("admin-user", is_admin=True)
            token = str(created.get("token") or "")
            calls: list[tuple[str, str, str]] = []

            async def _fake_request(self, method: str, url: str, *, headers=None, json=None, **kwargs):
                auth = str((headers or {}).get("Authorization") or "")
                calls.append((method.upper(), url, auth))
                if method.upper() == "GET":
                    return httpx.Response(
                        200,
                        json={"ok": True, "result": {"groups": [{"group_id": "g-upstream"}]}},
                        request=httpx.Request(method, url),
                    )
                return httpx.Response(
                    200,
                    json={"ok": True, "result": {"group": {"group_id": "g-new", "title": (json or {}).get("title")}}},
                    request=httpx.Request(method, url),
                )

            with patch("cccc.ports.web.routes.base.httpx.AsyncClient.request", new=_fake_request):
                with self._client() as client:
                    get_resp = client.get("/api/v1/remote_backends/prod/groups", headers={"Authorization": f"Bearer {token}"})
                    create_resp = client.post(
                        "/api/v1/remote_backends/prod/groups",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"title": "New Remote", "topic": "via backend"},
                    )

            self.assertEqual(get_resp.status_code, 200)
            self.assertEqual(create_resp.status_code, 200)
            self.assertEqual(
                calls,
                [
                    ("GET", "http://remote-host:18848/api/v1/groups", "Bearer remote-token"),
                    ("POST", "http://remote-host:18848/api/v1/groups", "Bearer remote-token"),
                ],
            )
        finally:
            cleanup()
