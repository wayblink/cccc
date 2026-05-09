# CCCC Terminal Message Runtime v1

Status: Draft, with backend contract/store and PTY raw-output streaming slice implemented

This document defines the first-layer terminal runtime contract for CCCC.
It focuses on reliable message-oriented interaction between CCCC and long-running
agent CLIs such as Claude Code and Codex.

This contract intentionally does not copy a terminal application's block, pane,
or full snapshot model. CCCC already has its own collaboration structure:
groups, agents, messages, and ledgers. The terminal layer should serve that
structure rather than introduce a competing one.

## 0. Conformance Language

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**
are to be interpreted as described in RFC 2119.

## 1. Goals and Non-Goals

### 1.1 Goals

Terminal Message Runtime v1 MUST provide:

- A bidirectional runtime endpoint for each agent-backed terminal.
- Streaming intermediate output for long-running agent work.
- A clean separation between run events and durable conversation messages.
- Basic control operations: write, submit, interrupt, resize, terminate, close.
- Provider resume metadata for Claude/Codex native session recovery.
- Ordered events so Web, CLI, MCP, and future IM/mobile surfaces can observe the
  same runtime state.

### 1.2 Non-Goals

Terminal Message Runtime v1 does NOT standardize:

- A Warp-style command block model.
- A pane/session/subsession tree.
- Full terminal screen emulation as the durable state model.
- Arbitrary PTY process resurrection after the process exits.
- Perfect final-answer extraction from raw terminal bytes.
- Provider-specific prompt or reasoning semantics.

## 2. Design Thesis

CCCC's natural unit of collaboration is not a terminal command block. It is:

- a group,
- an agent,
- a user or agent message,
- an agent run,
- a stream of run events,
- and a final answer message.

Therefore, long-running terminal output SHOULD be modeled as a stream of
execution events under one `AgentRun`, not as many top-level chat messages and
not as a single blocking response.

The core flow is:

```text
AgentInputMessage
  -> AgentRun
      -> RunEvents: output_delta / progress / status / error / resume metadata
      -> FinalMessage
```

## 3. Terminology

- **Group**: CCCC collaboration group.
- **Agent**: Actor that may be backed by Claude, Codex, shell, or another
  provider.
- **TerminalPort**: The bidirectional message endpoint that connects one agent
  to one terminal-backed runtime process.
- **AgentRun**: The execution lifecycle created when an input message is sent to
  an agent.
- **RunEvent**: A streaming event emitted while an `AgentRun` is active.
- **FinalMessage**: The durable conversation message persisted after an
  `AgentRun` completes.
- **ProviderAdapter**: Provider-specific translator that maps raw terminal
  stream data into CCCC run events and final-message candidates.
- **ResumeState**: Provider metadata needed to restart an agent CLI in its
  native resume mode.

## 4. Core Model

### 4.1 TerminalPort

Each agent that uses a terminal runtime SHOULD own one active `TerminalPort`.

```ts
type TerminalPort = {
  terminal_id: string
  group_id: string
  agent_id: string
  provider: "claude" | "codex" | "shell" | string
  cwd?: string
  env?: Record<string, string>
  process_status: "starting" | "running" | "waiting" | "exited" | "failed" | "closed"
  last_seq: number
  last_output_at?: string
  resume_state?: ResumeState
  created_at: string
  updated_at: string
}
```

Rules:

- `terminal_id`, `group_id`, and `agent_id` MUST be stable for the lifetime of a
  port.
- `provider` MUST identify the adapter responsible for parsing output and
  constructing resume commands.
- `last_seq` MUST be monotonic for all events emitted by the port.
- The port SHOULD be treated as a runtime endpoint, not as a top-level
  collaboration actor.

### 4.2 AgentRun

One input message to an agent creates one `AgentRun`.

```ts
type AgentRun = {
  run_id: string
  input_message_id: string
  group_id: string
  agent_id: string
  terminal_id: string
  status: "queued" | "running" | "waiting_for_input" | "completed" | "failed" | "cancelled"
  started_at?: string
  completed_at?: string
  final_message_id?: string
  error?: RuntimeError
}
```

Rules:

- An `AgentRun` MUST NOT be represented as a single blocking response.
- Intermediate output MUST be emitted as `RunEvent` items.
- Only the final answer SHOULD become a normal durable conversation message.
- A failed or cancelled run MAY produce no `FinalMessage`.

### 4.3 RunEvent

`RunEvent` is the streaming observation unit for long-running work.

```ts
type RunEvent = {
  event_id: string
  seq: number
  ts: string
  group_id: string
  agent_id: string
  terminal_id: string
  run_id?: string
  type:
    | "agent.run.started"
    | "agent.run.output_delta"
    | "agent.run.progress"
    | "agent.run.status_changed"
    | "agent.run.session_detected"
    | "agent.run.waiting_for_input"
    | "agent.run.interrupted"
    | "agent.run.completed"
    | "agent.run.failed"
    | "agent.run.cancelled"
    | "terminal.raw_output"
    | "terminal.error"
  payload: Record<string, unknown>
}
```

Rules:

- `seq` MUST be monotonic per `terminal_id`.
- Clients MUST tolerate duplicate events after reconnect and SHOULD reconcile by
  `event_id` or `(terminal_id, seq)`.
- `terminal.raw_output` MAY contain raw or minimally cleaned terminal text.
- `agent.run.progress` SHOULD contain user-visible intermediate status.
- `agent.run.output_delta` SHOULD contain live output suitable for a running UI
  bubble or expandable run detail.
- `agent.run.completed` SHOULD be followed by a durable `FinalMessage` when the
  provider adapter can identify or construct one.

### 4.4 FinalMessage

The final answer is a normal CCCC conversation message linked back to its run.

```ts
type FinalMessageLink = {
  message_id: string
  run_id: string
  terminal_id: string
  agent_id: string
}
```

Rules:

- The final message SHOULD be concise conversation history.
- Raw terminal output MUST NOT be blindly copied into conversation history.
- If the adapter cannot reliably identify the final answer, it SHOULD emit a
  `final_candidate` in run details and leave finalization to the upper layer or
  user action.

## 5. TerminalPort Inbox

CCCC sends commands to a terminal through the port inbox.

```ts
type TerminalPortCommand =
  | { type: "write_text"; text: string }
  | { type: "write_line"; text: string }
  | { type: "send_key"; key: string }
  | { type: "resize"; rows: number; cols: number }
  | { type: "interrupt" }
  | { type: "terminate" }
  | { type: "close" }
  | { type: "resume"; resume_state: ResumeState }
```

Rules:

- `write_line` means writing text plus newline to the PTY. It MUST NOT imply
  high-level task semantics.
- `interrupt` SHOULD map to Ctrl-C or the provider-specific equivalent.
- `terminate` SHOULD request process termination and MAY escalate according to
  daemon policy.
- `resume` MUST use provider-specific resume metadata; it MUST NOT pretend to
  restore arbitrary killed PTY processes.

## 6. Provider Resume

CCCC v1 recovery is provider session recovery, not arbitrary terminal process
resurrection.

```ts
type ResumeState = {
  provider: "claude" | "codex" | string
  provider_session_id?: string
  resume_command?: string[]
  cwd?: string
  env?: Record<string, string>
  detected_at?: string
}
```

Rules:

- The daemon SHOULD persist `ResumeState` when a provider session id is detected.
- Claude and Codex adapters SHOULD prefer native resume mechanisms such as a
  provider session id.
- If no provider session id is available, the adapter MAY restart a fresh
  provider process but MUST report that semantic resume was unavailable.
- Resume restores agent context only to the extent supported by the provider.

## 7. PTY Boundary

PTY is the byte-level terminal transport. It can support:

- streaming output,
- bidirectional input,
- terminal resize,
- interrupt and termination signals,
- process exit status,
- and long-running task observation.

PTY does not by itself support:

- progress/final classification,
- semantic agent resume,
- clean markdown extraction,
- or durable conversation semantics.

Therefore, implementations SHOULD keep this split:

```text
PTY
  -> TerminalPort
  -> ProviderAdapter
  -> RunEvents
  -> FinalMessage
```

## 8. Provider Adapter Responsibilities

A provider adapter SHOULD:

- launch the provider CLI in a PTY-compatible mode,
- detect provider session ids when possible,
- parse or clean ANSI/control output enough for UI display,
- classify stream chunks as raw output, progress, or final candidates when
  reliable,
- construct resume commands from `ResumeState`,
- detect waiting-for-input states when possible,
- and preserve enough raw output for debugging.

Adapters MUST be conservative. If an adapter cannot reliably identify a final
answer, it SHOULD not fabricate one.

## 9. UI Semantics

CCCC UI SHOULD distinguish conversation history from live run observation.

Recommended presentation:

- Main conversation:
  - user input messages,
  - agent final messages,
  - one live running bubble while an `AgentRun` is active.
- Run detail or terminal drawer:
  - raw terminal stream,
  - progress events,
  - output deltas,
  - provider session/resume status,
  - errors and exit status.

This keeps the conversation readable while still giving users immediate feedback
for long-running work.

## 10. Event Durability

The daemon SHOULD persist enough runtime events to support reconnect and
diagnostics.

Minimum durable fields:

- `terminal_id`
- `run_id`
- `agent_id`
- `group_id`
- `seq`
- `type`
- `ts`
- cleaned text or payload summary
- provider session id when detected
- exit/error state

Raw terminal data MAY be stored in bounded blobs instead of the group ledger when
large. Conversation messages SHOULD reference those blobs rather than embedding
large output directly.

## 11. Security and Permissions

Terminal Message Runtime v1 defines mechanics, not the full collaboration policy.

The upper semantic layer SHOULD enforce:

- who can send input to a terminal,
- who can interrupt or terminate a run,
- whether risky commands require approval,
- how ownership and handoff work,
- and what remote surfaces are allowed to do.

The terminal layer MAY include actor ids for audit correlation, but it SHOULD NOT
own the full permission model.

## 12. Implementation Notes

A practical v1 implementation can start with:

1. `TerminalPort` state in the daemon.
2. PTY spawn/read/write/resize/interrupt primitives.
3. Ordered `RunEvent` emission.
4. Provider adapters for Claude and Codex.
5. Provider session id detection and `ResumeState` persistence.
6. Web UI subscription for live run events.
7. Final-message creation after run completion.

Avoid implementing command blocks, pane trees, and full terminal snapshots until
real product usage proves they are necessary.

## 13. Open Questions

- How reliably can Claude and Codex CLIs expose or print their session ids?
- Should final-message extraction be automatic per provider, user-confirmed, or
  both?
- What retention policy should apply to raw terminal blobs?
- Which terminal controls are safe for remote IM/mobile surfaces?
- Should `TerminalPort` support more than one active `AgentRun`, or should v1
  enforce one run at a time per agent terminal?

## 14. Decision Log

2026-05-08:

- Decided not to use a Warp-style block model for CCCC v1 because CCCC
  conversation messages and agent runs are the natural collaboration blocks.
- Decided not to model pane/session trees in v1 because CCCC already organizes
  work as group -> agent -> terminal.
- Decided that v1 recovery should rely on Claude/Codex native resume metadata
  instead of arbitrary PTY process resurrection.
- Decided that long-running output should stream as run events and later
  converge into one final conversation message.
- Confirmed that PTY is a suitable byte-level transport for streaming,
  bidirectional terminal interaction, but not for final-answer classification or
  semantic resume.

## 15. Implementation Slices

The first backend slice implements the model and persistence boundary.

Implemented Python contracts:

- `TerminalPort`
- `AgentRun`
- `RunEvent`
- `ResumeState`
- `FinalMessage`

Implemented persistence root:

```text
groups/<group_id>/state/terminal_runtime/
  ports/<port_id>.json
  runs/<run_id>.json
  events/<run_id>.jsonl
  resume/<actor_id>.json
```

Implemented daemon operations:

- `terminal_runtime_port_upsert`
- `terminal_runtime_run_start`
- `terminal_runtime_event_append`
- `terminal_runtime_run_complete`
- `terminal_runtime_run_tail`

Implementation status values:

- `AgentRun.status`: `running`, `completed`, `failed`, `canceled`
- `RunEvent.type`: `input`, `raw_output`, `progress`, `tool`, `status`,
  `error`, `final`

This slice establishes the durable contract for long-running terminal work:
intermediate information is appended as ordered run events, while the final
answer is linked through `final_message_event_id` and can be promoted into the
normal CCCC conversation ledger by the next integration layer.

The second backend slice wires daemon-managed agent PTY starts into the runtime
store:

- `PtySession` accepts an `on_output` callback.
- `PtySupervisor.start_actor` forwards the callback when launching a PTY actor.
- Agent PTY start paths create a `TerminalPort` and initial `AgentRun`.
- PTY output chunks are persisted as ordered `raw_output` events with byte
  counts.

This gives CCCC an actual intermediate-output channel for long-running terminal
agents. Provider-specific classification, final-answer extraction, and final
conversation-message promotion remain the next integration layer.
