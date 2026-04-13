from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from ..schemas import RouteContext, get_principal, require_user


class ScriptUpsertRequest(BaseModel):
    name: str
    kind: str = Field(default="service")
    command: str
    cwd: str
    env: Dict[str, str] = Field(default_factory=dict)
    by: str = Field(default="user")


def _resolve_by(request: Request, fallback: str = "user") -> str:
    principal = get_principal(request)
    user_id = str(getattr(principal, "user_id", "") or "").strip()
    if user_id:
        return user_id
    value = str(fallback or "").strip()
    return value or "user"


def create_routers(ctx: RouteContext) -> list[APIRouter]:
    router = APIRouter(prefix="/api/v1")

    @router.get("/scripts", dependencies=[Depends(require_user)])
    async def scripts_list() -> Dict[str, Any]:
        return await ctx.daemon({"op": "script_list", "args": {}})

    @router.get("/scripts/{script_id}", dependencies=[Depends(require_user)])
    async def scripts_get(script_id: str) -> Dict[str, Any]:
        return await ctx.daemon({"op": "script_get", "args": {"script_id": script_id}})

    @router.post("/scripts", dependencies=[Depends(require_user)])
    async def scripts_create(request: Request, req: ScriptUpsertRequest) -> Dict[str, Any]:
        return await ctx.daemon(
            {
                "op": "script_create",
                "args": {
                    "name": req.name,
                    "kind": req.kind,
                    "command": req.command,
                    "cwd": req.cwd,
                    "env": dict(req.env or {}),
                    "by": _resolve_by(request, req.by),
                },
            }
        )

    @router.put("/scripts/{script_id}", dependencies=[Depends(require_user)])
    async def scripts_update(script_id: str, request: Request, req: ScriptUpsertRequest) -> Dict[str, Any]:
        return await ctx.daemon(
            {
                "op": "script_update",
                "args": {
                    "script_id": script_id,
                    "name": req.name,
                    "kind": req.kind,
                    "command": req.command,
                    "cwd": req.cwd,
                    "env": dict(req.env or {}),
                    "by": _resolve_by(request, req.by),
                },
            }
        )

    @router.delete("/scripts/{script_id}", dependencies=[Depends(require_user)])
    async def scripts_delete(script_id: str, request: Request, by: str = "user") -> Dict[str, Any]:
        return await ctx.daemon(
            {
                "op": "script_delete",
                "args": {"script_id": script_id, "by": _resolve_by(request, by)},
            }
        )

    @router.post("/scripts/{script_id}/run", dependencies=[Depends(require_user)])
    async def scripts_run(script_id: str, request: Request, by: str = "user") -> Dict[str, Any]:
        return await ctx.daemon(
            {
                "op": "script_run",
                "args": {"script_id": script_id, "by": _resolve_by(request, by)},
            }
        )

    @router.post("/scripts/{script_id}/stop", dependencies=[Depends(require_user)])
    async def scripts_stop(script_id: str, request: Request, by: str = "user") -> Dict[str, Any]:
        return await ctx.daemon(
            {
                "op": "script_stop",
                "args": {"script_id": script_id, "by": _resolve_by(request, by)},
            }
        )

    @router.post("/scripts/{script_id}/restart", dependencies=[Depends(require_user)])
    async def scripts_restart(script_id: str, request: Request, by: str = "user") -> Dict[str, Any]:
        return await ctx.daemon(
            {
                "op": "script_restart",
                "args": {"script_id": script_id, "by": _resolve_by(request, by)},
            }
        )

    @router.get("/scripts/{script_id}/attach", dependencies=[Depends(require_user)])
    async def scripts_attach(script_id: str, request: Request, by: str = "user") -> Dict[str, Any]:
        return await ctx.daemon(
            {
                "op": "script_attach",
                "args": {"script_id": script_id, "by": _resolve_by(request, by)},
            }
        )

    return [router]
