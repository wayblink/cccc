from __future__ import annotations

import os
from urllib.parse import quote, unquote
import re
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
import httpx
from starlette.background import BackgroundTask
from starlette.datastructures import MutableHeaders
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

StateGetter = Callable[[Scope, str, object], object]
TokenPartsGetter = Callable[[Request], tuple[str, str]]
PublicPathChecker = Callable[[Request], bool]
PrincipalResolver = Callable[[Request], object]
TokensActiveGetter = Callable[[], bool]
RemoteGroupGetter = Callable[[str], dict | None]
GroupChecker = Callable[[Request, str], object]


def _scope_state_get(scope: Scope, key: str, default: object = None) -> object:
    state = scope.setdefault("state", {})
    if not isinstance(state, dict):
        return default
    return state.get(key, default)


class AuthMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        *,
        signed_out_cookie: str,
        request_token_parts: TokenPartsGetter,
        is_public_path: PublicPathChecker,
        resolve_principal: PrincipalResolver,
        tokens_active: TokensActiveGetter,
        state_getter: StateGetter = _scope_state_get,
    ):
        self.app = app
        self._signed_out_cookie = signed_out_cookie
        self._request_token_parts = request_token_parts
        self._is_public_path = is_public_path
        self._resolve_principal = resolve_principal
        self._tokens_active = tokens_active
        self._state_getter = state_getter

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        provided_token, token_source = self._request_token_parts(request)
        logout_marker = str(request.cookies.get(self._signed_out_cookie) or "").strip() == "1"
        if logout_marker and token_source == "cookie":
            provided_token = ""
            token_source = ""
        principal = self._resolve_principal(request if not logout_marker else request)
        stale_cookie = logout_marker and bool(str(request.cookies.get("cccc_access_token") or "").strip())
        if logout_marker and stale_cookie:
            principal = type(principal)(kind="anonymous")
        tokens_active = bool(self._tokens_active())

        if not self._is_public_path(request) and provided_token and principal.kind != "user":
            if token_source in ("header", "query") or tokens_active:
                resp = JSONResponse(
                    status_code=401,
                    content={"ok": False, "error": {"code": "unauthorized", "message": "missing/invalid token", "details": {}}},
                )
                await resp(scope, receive, send)
                return
            if token_source == "cookie":
                stale_cookie = True

        if not self._is_public_path(request) and not provided_token and tokens_active and principal.kind != "user":
            path = str(request.url.path or "")
            if path.startswith("/api/"):
                resp = JSONResponse(
                    status_code=401,
                    content={"ok": False, "error": {"code": "unauthorized", "message": "authentication required", "details": {}}},
                )
                await resp(scope, receive, send)
                return

        scope.setdefault("state", {})
        scope["state"]["principal"] = principal

        async def send_with_auth(message: Message) -> None:
            if message["type"] == "http.response.start":
                cookie_headers: list[tuple[bytes, bytes]] = []
                if stale_cookie:
                    temp = Response()
                    temp.delete_cookie(key="cccc_access_token", path="/")
                    cookie_headers.extend(temp.raw_headers)

                if logout_marker and principal.kind == "user" and token_source in ("header", "query"):
                    temp = Response()
                    temp.delete_cookie(key=self._signed_out_cookie, path="/")
                    cookie_headers.extend(temp.raw_headers)

                skip_cookie_refresh = bool(self._state_getter(scope, "skip_token_cookie_refresh", False))
                if (
                    not skip_cookie_refresh
                    and principal.kind == "user"
                    and provided_token
                    and str(request.cookies.get("cccc_access_token") or "").strip() != provided_token
                ):
                    force_secure = str(os.environ.get("CCCC_WEB_SECURE") or "").strip().lower() in ("1", "true", "yes")
                    forwarded_proto = str(request.headers.get("x-forwarded-proto") or "").strip().lower()
                    actual_scheme = "https" if force_secure else (
                        forwarded_proto if forwarded_proto in ("http", "https") else str(getattr(request.url, "scheme", "") or "").lower()
                    )
                    temp = Response()
                    temp.set_cookie(
                        key="cccc_access_token",
                        value=provided_token,
                        httponly=True,
                        samesite="none" if actual_scheme == "https" else "lax",
                        secure=actual_scheme == "https",
                        path="/",
                    )
                    cookie_headers.extend(temp.raw_headers)

                if cookie_headers:
                    headers = MutableHeaders(raw=message["headers"])
                    for header_name, header_value in cookie_headers:
                        if header_name.lower() == b"set-cookie":
                            headers.append("set-cookie", header_value.decode("latin-1"))
            await send(message)

        await self.app(scope, receive, send_with_auth)


class ReadOnlyGuardMiddleware:
    def __init__(self, app: ASGIApp, *, read_only: bool):
        self.app = app
        self.read_only = read_only

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        if self.read_only:
            method = str(scope.get("method") or "").upper()
            if method not in ("GET", "HEAD", "OPTIONS"):
                resp = JSONResponse(
                    status_code=403,
                    content={
                        "ok": False,
                        "error": {
                            "code": "read_only",
                            "message": "CCCC Web is running in read-only (exhibit) mode.",
                            "details": {},
                        },
                    },
                )
                await resp(scope, receive, send)
                return
        await self.app(scope, receive, send)


class UiCacheControlMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        path = str(scope.get("path") or "")

        async def send_with_cache_control(message: Message) -> None:
            if message["type"] == "http.response.start" and path.startswith("/ui"):
                headers = MutableHeaders(raw=message["headers"])
                headers["Cache-Control"] = "no-cache"
            await send(message)

        await self.app(scope, receive, send_with_cache_control)


class RemoteGroupProxyMiddleware:
    _GROUP_PATH_RE = re.compile(r"^/api/v1/groups/([^/]+)(/.*)?$")

    def __init__(
        self,
        app: ASGIApp,
        *,
        get_remote_group: RemoteGroupGetter,
        check_group: GroupChecker,
    ):
        self.app = app
        self._get_remote_group = get_remote_group
        self._check_group = check_group

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        path = str(scope.get("path") or "")
        match = self._GROUP_PATH_RE.match(path)
        if not match:
            await self.app(scope, receive, send)
            return

        gid = unquote(str(match.group(1) or "").strip())
        if not gid:
            await self.app(scope, receive, send)
            return
        route = self._get_remote_group(gid)
        if not isinstance(route, dict):
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        try:
            self._check_group(request, gid)
        except StarletteHTTPException as exc:
            resp = JSONResponse(
                status_code=int(getattr(exc, "status_code", 403) or 403),
                content={"ok": False, "error": exc.detail if isinstance(exc.detail, dict) else {"code": "permission_denied", "message": "group access denied", "details": {"group_id": gid}}},
            )
            await resp(scope, receive, send)
            return

        method = str(scope.get("method") or "GET").upper()
        remote_group_id = str(route.get("remote_group_id") or gid).strip() or gid
        base_url = str(route.get("base_url") or "").strip().rstrip("/")
        tail = str(match.group(2) or "")
        query_raw = scope.get("query_string") or b""
        if isinstance(query_raw, bytes):
            query = query_raw.decode("latin-1")
        else:
            query = str(query_raw or "")
        remote_url = f"{base_url}/api/v1/groups/{quote(remote_group_id, safe='')}{tail}"
        if query:
            remote_url = f"{remote_url}?{query}"

        body = await request.body()
        outgoing_headers: dict[str, str] = {}
        for key, value in request.headers.items():
            lk = key.lower()
            if lk in {"host", "content-length", "authorization", "cookie"}:
                continue
            outgoing_headers[key] = value
        token = str(route.get("access_token") or "").strip()
        if token:
            outgoing_headers["Authorization"] = f"Bearer {token}"
        else:
            incoming_auth = str(request.headers.get("authorization") or "").strip()
            if incoming_auth:
                outgoing_headers["Authorization"] = incoming_auth
        outgoing_headers["X-CCCC-Remote-Proxy"] = "1"

        timeout = httpx.Timeout(connect=10.0, read=None, write=30.0, pool=30.0)
        try:
            client = httpx.AsyncClient(timeout=timeout, follow_redirects=False)
            upstream = await client.send(
                client.build_request(method, remote_url, headers=outgoing_headers, content=body),
                stream=True,
            )
        except Exception as exc:
            resp = JSONResponse(
                status_code=502,
                content={
                    "ok": False,
                    "error": {
                        "code": "remote_group_unavailable",
                        "message": "remote group unavailable",
                        "details": {"group_id": gid, "base_url": base_url, "reason": str(exc)},
                    },
                },
            )
            await resp(scope, receive, send)
            return

        headers: dict[str, str] = {}
        for key, value in upstream.headers.items():
            lk = key.lower()
            if lk in {"content-length", "transfer-encoding", "connection", "keep-alive"}:
                continue
            headers[key] = value
        headers["X-CCCC-Remote-Proxy"] = "1"
        response = StreamingResponse(
            upstream.aiter_bytes(),
            status_code=upstream.status_code,
            headers=headers,
            background=BackgroundTask(self._close_upstream, upstream, client),
        )
        await response(scope, receive, send)

    @staticmethod
    async def _close_upstream(upstream: httpx.Response, client: httpx.AsyncClient) -> None:
        try:
            await upstream.aclose()
        finally:
            await client.aclose()
