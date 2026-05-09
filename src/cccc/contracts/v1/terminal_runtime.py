from __future__ import annotations

import uuid
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ...util.time import utc_now_iso


TerminalTransport = Literal["pty", "headless", "external"]
TerminalRunStatus = Literal["running", "completed", "failed", "canceled"]
RunEventType = Literal["input", "raw_output", "progress", "tool", "status", "error", "final"]


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


class ResumeState(BaseModel):
    provider: str = ""
    native_session_id: str = ""
    cwd: str = ""
    command: List[str] = Field(default_factory=list)
    updated_at: str = Field(default_factory=utc_now_iso)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="forbid")


class TerminalPort(BaseModel):
    v: int = 1
    id: str = Field(default_factory=lambda: _new_id("term"))
    group_id: str
    actor_id: str
    runtime: str = ""
    transport: TerminalTransport = "pty"
    provider: str = ""
    native_session_id: str = ""
    cwd: str = ""
    command: List[str] = Field(default_factory=list)
    status: Literal["active", "stopped"] = "active"
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("group_id", "actor_id")
    @classmethod
    def _required_id(cls, value: str) -> str:
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError("required id is empty")
        return cleaned

    model_config = ConfigDict(extra="forbid")


class AgentRun(BaseModel):
    v: int = 1
    id: str = Field(default_factory=lambda: _new_id("run"))
    group_id: str
    actor_id: str
    port_id: str
    status: TerminalRunStatus = "running"
    input_text: str = ""
    started_at: str = Field(default_factory=utc_now_iso)
    ended_at: Optional[str] = None
    final_message_event_id: Optional[str] = None
    resume_state: ResumeState = Field(default_factory=ResumeState)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("group_id", "actor_id", "port_id")
    @classmethod
    def _required_id(cls, value: str) -> str:
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError("required id is empty")
        return cleaned

    model_config = ConfigDict(extra="forbid")


class RunEvent(BaseModel):
    v: int = 1
    id: str = Field(default_factory=lambda: _new_id("runev"))
    seq: int = 0
    ts: str = Field(default_factory=utc_now_iso)
    group_id: str
    actor_id: str
    port_id: str
    run_id: str
    type: RunEventType
    text: str = ""
    data: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("group_id", "actor_id", "port_id", "run_id")
    @classmethod
    def _required_id(cls, value: str) -> str:
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError("required id is empty")
        return cleaned

    model_config = ConfigDict(extra="forbid")


class FinalMessage(BaseModel):
    run_id: str
    event_id: str = ""
    text: str
    format: Literal["plain", "markdown"] = "markdown"

    model_config = ConfigDict(extra="forbid")
