# Script Manager Design

Date: 2026-04-13
Status: Draft approved in chat

## Goal

Add a top-level `Script Manager` to CCCC for managing global local commands. Users can define scripts, start or stop them from the web UI, and view live console output plus the most recent run output.

This is intentionally **not** part of the `group`, `workspace`, or `actor` model.

## Product Boundary

- Entry lives in the lower-left navigation as a top-level icon
- Clicking the icon opens a dedicated Script Manager page
- Scripts are global definitions, not scoped to any group or workspace
- Each script supports:
  - `name`
  - `command`
  - `cwd`
  - `env`
- Each script is single-instance only
- Each script keeps only the latest run output

## Why Not Reuse Actors

CCCC actors are group-oriented agent runtime units with identity, runtime, runner, profile, capability, and collaboration semantics. Script Manager needs a simpler global process model.

The design therefore:

- does **not** reuse actor product semantics
- does reuse existing PTY, transcript, and streaming infrastructure underneath

## UX Structure

Page layout uses the confirmed `A1` structure:

- left: script list
- right top: configuration form
- right bottom: fixed console

### Script List

Each item shows:

- name
- current status
- most recent run time

Supported visible states:

- `idle`
- `running`
- `success`
- `failed`

Top-level action:

- `New Script`

### Detail Panel

When selecting an existing script, the right panel shows its editable configuration:

- `name`
- `command`
- `cwd`
- `env`

When clicking `New Script`, the right panel becomes an empty inline form instead of using a modal.

### Console Panel

- If the selected script is running, show live streaming output
- If the selected script is not running, show the latest saved output
- Auto-scroll by default, but stop forcing scroll when the user manually scrolls upward

## Core Interactions

### Create

- Click `New Script`
- Fill inline form on the right
- Save
- New script appears in list and becomes selected

### Edit

- Edit directly in the right panel
- Show `Save` and `Discard` when there are unsaved changes

### Run

- Script must be saved before running
- `Run` starts a new PTY-backed session
- Status becomes `running`
- Console switches to live output

### Stop

- `Stop` terminates the running session
- Output from that run is retained as the latest output
- List returns to `idle`
- Detail view can indicate the last run was stopped manually

### Restart

- If running: stop current session, then start a new one
- If idle: same effect as `Run`

### Navigation

- Switching scripts is allowed while a script is running
- Unsaved edits should trigger a lightweight save/discard guard before switching
- Refreshing the page should not stop a running script

## Runtime Model

The implementation should separate persistent configuration from runtime state.

### Persistent

#### `Script`

- `id`
- `name`
- `command`
- `cwd`
- `env`
- `created_at`
- `updated_at`

#### `ScriptLastOutput`

- `script_id`
- `result` (`success`, `failed`, `stopped`)
- `text`
- `started_at`
- `ended_at`
- `truncated`

### In-Memory Runtime

#### `ScriptRunState`

- `script_id`
- `status` (`starting`, `running`, `stopping`, `idle`)
- `session_id`
- `started_at`
- `ended_at`
- `exit_code`

## Lifecycle Rules

### Start

- Validate script exists and is not already running
- Create PTY session
- Stream output to the browser and buffer it for latest-output persistence

### Running

- Browser reconnect can reattach to the active stream
- Page refresh does not terminate the process

### Stop

- Send stop signal to the PTY process
- Finalize buffered output into `ScriptLastOutput`
- Clear runtime state back to idle

### Exit

- Exit code `0` records `success`
- Non-zero exit records `failed`
- In both cases the latest output is retained

### Daemon Restart

- Managed scripts are not auto-restored in V1
- After daemon restart, scripts are shown as not running
- The latest saved output remains available

## Interface Boundary

Add a dedicated script API surface instead of overloading actor or group APIs.

Expected daemon operations:

- `script_list`
- `script_get`
- `script_create`
- `script_update`
- `script_delete`
- `script_run`
- `script_stop`
- `script_restart`
- `script_attach`

Notes:

- `script_attach` is for live console streaming / reconnect
- Script output should not flow through group messaging channels

## Reuse Strategy

### Reuse

- PTY runner
- terminal transcript primitives
- output streaming transport

### Do Not Reuse

- actor lifecycle model
- actor profile model
- group state
- task / coordination / memory semantics

## V1 Scope

V1 should include:

- global script CRUD
- per-script single-instance execution
- live console output
- latest-output persistence
- run / stop / restart
- browser reconnect to live output
- simple status presentation

## Non-Goals For V1

- multi-instance execution for one script
- full run history
- script folders, tags, or advanced organization
- auto-restart or boot-time recovery
- daemon-restart automatic restoration
- interactive input workflows
- permission orchestration
- group or actor integration
- automation integration

## Acceptance Criteria

- User can create a script with `name`, `command`, `cwd`, and `env`
- User can run one saved script from the web page
- User can see live output while the script runs
- User can stop or restart the script
- User can refresh the page and reconnect to a still-running script
- User can revisit the script later and see the most recent output
- The feature is reachable from a dedicated lower-left navigation entry
