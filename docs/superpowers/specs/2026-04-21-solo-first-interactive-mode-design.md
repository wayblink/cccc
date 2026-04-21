# Solo-First Interactive Mode Design

Date: 2026-04-21
Status: Approved in chat

## Goal

Make CCCC support a true solo-first interactive product surface that feels closer to the Codex client, while preserving the current multi-agent collaboration system as a separate advanced mode.

V1 should change the product model the user sees, not just hide a few buttons. The default experience should be:

- one workspace
- multiple independent conversation threads
- one visible assistant per thread
- independent execution context per thread
- collaboration available through a separate entry when needed

## Problem Statement

CCCC already supports single-agent usage, but the product is still collaboration-first.

Current evidence in the repo:

- `README.zh-CN.md` explicitly describes single-agent local coding help as usable but not the main value
- `docs/guide/workflows.md` includes a solo workflow, but it is still expressed in `group / actor` terms
- `src/cccc/kernel/system_prompt.py` already contains solo-aware prompt handling, but it still frames the session as an actor inside a group
- the web UI and APIs are centered on `group`, `actor`, chat slots, recipients, and runtime actors

That means the product can behave solo, but it does not feel solo-first.

## Confirmed Product Decisions

The following decisions were confirmed with the user during brainstorming:

- Build a true new product model for solo interaction, not just a hidden collaboration skin
- Top-level model is `workspace -> multiple threads`
- Each thread has an independent execution context
- Frontend should expose a single assistant, not explicit `actor` creation
- `runtime` and `model` live in settings, not in the main interaction surface
- Default entry should be the solo interactive mode
- Multi-agent collaboration remains available through a separate advanced entry
- A solo thread can be upgraded into collaboration mode later
- V1 does not support runtime-state migration during that upgrade
- V1 should keep the current web information architecture broadly intact instead of redesigning the entire shell

## Product Model

### User-Visible Objects

V1 introduces a user-facing model that does not expose collaboration terms:

- `workspace`
  - a user-visible project container bound to an attached root / scope
- `thread`
  - one independent conversation inside a workspace
- `thread_session`
  - the execution-bearing session for that thread
- `assistant_profile`
  - the settings-backed assistant configuration used by the workspace

The frontend should treat these as first-class concepts. Users in interactive mode should never need to understand `group`, `actor`, `foreman`, `peer`, `task`, `coordination`, or inbox routing.

### Object Responsibilities

#### Workspace

A workspace owns:

- the attached project root
- display name
- default assistant settings
- ordered thread list

V1 should keep workspace semantics simple. It is the user-facing container for threads, not a collaboration team.

#### Thread

A thread owns:

- title
- workspace binding
- transcript
- attachment references
- upgrade linkage to any collaboration session created from it
- one execution session

A thread is the primary object the user navigates.

#### Thread Session

A thread session owns the thread's independent runtime context:

- shell lifecycle
- PTY binding
- current working directory
- command history
- execution logs
- tool-call execution context

Two threads must not share a session. Switching threads should feel like switching between separate interactive coding conversations, not like swapping filters on a single shared terminal.

#### Assistant Profile

V1 should keep assistant settings workspace-scoped by default:

- model
- runtime
- optional prompt/profile preset
- execution preferences that belong in settings rather than in the main UI

Per-thread assistant overrides are explicitly out of scope for V1.

## UX Surface

### Default Entry

CCCC should open into the solo interactive mode by default.

Collaboration remains available, but through an explicit secondary entry such as:

- `Collaboration Mode`
- `Advanced Mode`
- equivalent wording that clearly signals a more specialized surface

The default mode should feel like a chat-first coding assistant, not a coordination console.

### Keep the Current Shell Structure

The user explicitly asked to keep the current web information architecture broadly consistent.

V1 therefore should preserve the existing shell shape already centered around:

- `web/src/App.tsx`
- `web/src/components/app/AppShell.tsx`
- `web/src/components/layout/GroupSidebar.tsx`
- `web/src/components/layout/AppHeader.tsx`
- `web/src/pages/chat/ChatTab.tsx`

The change is semantic and mode-aware, not a full IA redesign.

That means:

- the current sidebar shell remains
- the current header shell remains
- the current chat-first center panel remains
- existing modal and page structure should be reused when practical
- collaboration-only affordances are removed or renamed in interactive mode

### Visible Terminology Policy

Interactive mode should relabel the product around the new model:

- visible `group` -> `thread` or `workspace`, depending on the surface
- visible `actor` -> hidden; replaced by `assistant`
- visible `add actor` -> removed from interactive mode
- visible `@all / @foreman / @peers` -> removed from interactive mode
- visible inbox / coordination language -> removed from interactive mode

Likely front-end touchpoints for terminology and affordance cleanup:

- `web/src/hooks/useChatTab.ts`
- `web/src/pages/chat/ChatComposer.tsx`
- `web/src/pages/chat/ChatSlotStrip.tsx`
- `web/src/components/layout/AppHeader.tsx`
- `web/src/components/layout/GroupSidebar.tsx`
- `web/src/components/modals/CreateGroupModal.tsx`
- `web/src/components/modals/AddActorModal.tsx`
- `web/src/components/modals/GroupEditModal.tsx`
- `web/src/components/modals/InboxModal.tsx`

### Thread List Behavior

Because the current sidebar structure stays, the existing group list becomes a thread list in interactive mode.

V1 should preserve the useful existing behaviors where possible:

- ordered list
- selected item persistence
- archived section behavior, if retained for threads
- familiar mobile/sidebar interactions

The underlying implementation can still reuse the current sidebar mechanics, but the user-facing copy and object identity should be thread-based.

### New Thread Flow

Interactive mode should replace the current team-oriented creation flow with a thread-oriented one.

Recommended V1 behavior:

- if a workspace already exists, `new thread` only asks for a title or starts untitled and lets the user rename later
- if no workspace is attached yet, the first-run flow should attach/open a workspace first and then create the first thread
- interactive mode should not ask the user to create team members, assign roles, or choose foreman/peer topology

### Thread Header and Controls

The current header shell stays, but the controls become mode-aware.

Interactive mode header should prioritize:

- thread title
- workspace context
- assistant status
- settings
- `upgrade to collaboration mode`

Interactive mode header should not expose:

- actor count
- foreman/peer semantics
- group lifecycle language that only makes sense for visible teams

### Assistant Runtime Access

The user wants the UI to stay conceptually close to the current structure, but without exposing actors.

V1 should therefore keep runtime inspection capabilities available in a mode-aware way:

- do not expose per-actor tabs in interactive mode
- keep only one assistant-visible runtime entry
- label it as assistant work, terminal, or runtime, not as an actor identity
- keep any actor-specific debugging affordances behind advanced settings or collaboration mode

This allows reuse of current runtime plumbing such as `ActorTab` without forcing actor concepts into the solo UI.

## Collaboration Upgrade Flow

A solo thread should be able to upgrade into collaboration mode later, but V1 intentionally stops short of state migration.

### V1 Upgrade Definition

In V1, `upgrade to collaboration mode` means:

- create a new collaboration session from the current thread
- keep the original solo thread intact
- link the new collaboration session back to the source thread
- carry conversation context, workspace binding, and a bootstrap summary
- do not carry live shell state, PTY state, current process tree, or command history runtime state

### User-Facing Copy

The UI should be explicit about this behavior.

Recommended message:

- collaboration session will be created from the current thread context
- live runtime state will not be inherited in V1

This avoids a false promise of seamless execution continuity.

### Source Linkage

Store a durable linkage in both directions:

- thread -> spawned collaboration session id
- collaboration session -> `source_thread_id`

This supports auditability and later migration improvements.

## Internal Architecture

### Core Principle

The frontend should use the new interactive model, while the backend initially reuses the existing collaboration kernel through an adapter layer.

This is the core architectural choice that balances product clarity and implementation cost.

### Hidden Mapping to Existing Kernel

In V1, each interactive thread maps to hidden collaboration primitives:

- one `thread` maps to one hidden `group`
- that hidden group has one hidden primary `actor`
- the hidden actor owns the runtime, PTY, and execution context for the thread

This preserves the existing execution model while allowing the visible product model to change.

### Why This Mapping Is the Right V1 Trade-Off

Benefits:

- independent thread execution contexts can reuse the current actor/runtime lifecycle
- chat transport, streaming, attachments, and transcript persistence can keep reusing group-backed plumbing
- the daemon does not need a full runtime-manager rewrite in V1
- collaboration mode can remain intact for existing users

Cost:

- a translation layer is required between the visible thread model and hidden group/actor objects
- some existing APIs and stores remain collaboration-shaped internally

That cost is acceptable and still substantially better than either a shallow UI skin or a full product split.

### Metadata Requirements

The hidden backing objects need explicit metadata so interactive-mode data does not get confused with normal collaboration data.

Recommended metadata additions:

- workspace records store canonical project-root identity and default assistant settings
- thread records store `workspace_id`, `hidden_group_id`, and upgrade linkage
- hidden groups store markers such as `ui_mode=interactive` and `thread_id`
- hidden primary actors store markers such as `ui_kind=interactive_assistant`

Exact field names can be finalized during planning, but the design should assume first-class metadata rather than heuristics.

## API and Data Compatibility Strategy

### Dual Surface, Shared Core

V1 should introduce interactive-mode API semantics without breaking existing collaboration APIs.

Recommended approach:

- keep existing collaboration endpoints and stores available
- add interactive-facing APIs for `workspace`, `thread`, and assistant settings
- implement those APIs through an adapter that resolves to hidden `group` and `actor` resources

Illustrative V1 API surface:

- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/{workspace_id}/threads`
- `POST /api/v1/workspaces/{workspace_id}/threads`
- `GET /api/v1/threads/{thread_id}`
- `POST /api/v1/threads/{thread_id}/send`
- `POST /api/v1/threads/{thread_id}/reply`
- `POST /api/v1/threads/{thread_id}/upgrade_to_collaboration`
- `GET/PATCH /api/v1/workspaces/{workspace_id}/assistant_settings`

These can internally reuse current group-backed messaging routes and runtime lifecycle logic.

### No Forced Data Migration

V1 should not try to convert existing collaboration groups into interactive threads.

Instead:

- interactive workspaces/threads are created as new first-class records
- collaboration groups remain where they are
- collaboration mode continues reading the original collaboration data
- interactive mode reads its own workspace/thread index and resolves to hidden group backing objects

This avoids risky migration logic and keeps mode boundaries clear.

### Current Web Store Compatibility

The existing web store layer is heavily group-shaped, especially:

- `web/src/stores/groupStoreCore.ts`
- `web/src/hooks/useAppGroupLifecycle.ts`
- `web/src/services/api/groups.ts`
- `web/src/services/api/context.ts`

V1 should prefer a compatibility layer over a full rewrite.

Recommended strategy:

- keep existing state and streaming primitives where helpful
- introduce interactive view models and mode-aware selectors on top
- route interactive-mode actions through thread APIs that adapt to hidden group ids
- avoid wide churn across all chat components in the first release

## Prompt and Runtime Framing

The hidden actor's system prompt should not continue to feel like a miniature team if the user is in interactive mode.

Current solo handling in `src/cccc/kernel/system_prompt.py` is useful, but it still emits group/actor/team framing.

V1 should add an interactive-mode prompt branch that:

- frames the session as one assistant helping the user in one thread
- removes foreman/peer/team language
- keeps the important execution and verification invariants
- avoids collaboration-oriented chatter or routing assumptions

This matters because a solo-first product surface still feels collaboration-first if the assistant behaves like an actor in a team.

## Error Handling and Copy Policy

User-facing errors in interactive mode must never leak hidden collaboration primitives.

Recommended copy rules:

- hidden group creation failure -> `Failed to start thread`
- hidden actor/runtime launch failure -> `Failed to start assistant environment`
- interactive thread load failure -> `Failed to load thread`
- collaboration upgrade failure -> `Failed to create collaboration session`

Detailed `group / actor` diagnostics can still go to logs and advanced debugging surfaces, but not to the primary UI.

## V1 Scope

### Included

- default entry becomes solo interactive mode
- separate entry to collaboration mode remains available
- first-class `workspace -> threads` user model
- independent execution context per thread
- one visible assistant in interactive mode
- `runtime / model` moved to settings for this mode
- current shell structure reused with mode-aware terminology and controls
- thread creation flow that avoids actor/team concepts
- upgrade to collaboration mode as a new-session creation flow
- source linkage between the solo thread and spawned collaboration session
- prompt changes so interactive mode behaves single-assistant-first
- mode-aware suppression of recipient routing, chat slots, actor add/edit affordances, inbox semantics, and collaboration terminology

### Excluded

- runtime-state migration from a solo thread into collaboration mode
- hot transfer of shell, PTY, cwd, or process state
- per-thread assistant setting overrides
- full daemon runtime-manager rewrite
- auto-migration of existing collaboration groups into interactive threads
- exposing multi-assistant coordination inside interactive mode
- full shell/IA redesign of the web client

## Testing Strategy

V1 should be validated at four layers.

### Backend Mapping Tests

Verify that interactive thread operations:

- create hidden backing groups and actors correctly
- preserve one-to-one thread/session isolation
- store durable linkage metadata
- do not expose interactive backing objects through normal collaboration listings unless explicitly intended

### Messaging and Execution Tests

Verify that thread send/reply flows:

- route through the correct hidden group
- keep transcript continuity per thread
- keep runtime/session isolation across multiple threads in the same workspace
- preserve current streaming and attachment behavior

### Frontend Mode Tests

Verify that interactive mode:

- shows thread/workspace copy instead of group/actor copy
- hides `@all / @foreman / @peers`
- hides actor slot strips and actor-management flows
- exposes a single assistant-facing runtime entry only
- keeps current shell navigation working on desktop and mobile

### Upgrade Flow Tests

Verify that `upgrade to collaboration mode`:

- creates a collaboration session linked to the source thread
- transfers the intended context payload
- clearly communicates that runtime state is not inherited
- does not mutate or destroy the original thread

### Prompt Tests

Verify that interactive-mode prompt rendering:

- does not mention team/foreman/peer concepts
- still preserves required safety and verification behavior

## Rollout Plan

A gradual rollout is the safest path.

### Phase 1

- introduce workspace/thread records
- build hidden group/actor mapping
- add interactive-mode routes and APIs
- switch default entry to interactive mode behind a feature flag if needed

### Phase 2

- complete terminology cleanup and mode-aware UI suppression
- wire workspace-level assistant settings
- add collaboration-upgrade entry and linkage

### Phase 3

- evaluate whether runtime-state migration is worth adding
- evaluate whether more of the legacy group-shaped internals should be replaced rather than adapted

## Success Criteria

V1 is successful if all of the following are true:

- a new user lands in a product that feels like a chat-first solo coding assistant
- the user can create multiple threads inside one workspace naturally
- each thread behaves like an independent execution context
- the user never needs to understand `group / actor / foreman / peer` while staying in interactive mode
- collaboration remains available without contaminating the default solo mental model
- upgrading to collaboration mode is understandable and useful even without runtime-state migration

## Likely Implementation Touchpoints

This design most likely affects the following areas first:

- `web/src/App.tsx`
- `web/src/components/app/AppShell.tsx`
- `web/src/components/layout/AppHeader.tsx`
- `web/src/components/layout/GroupSidebar.tsx`
- `web/src/hooks/useAppGroupLifecycle.ts`
- `web/src/hooks/useChatTab.ts`
- `web/src/pages/chat/ChatTab.tsx`
- `web/src/pages/chat/ChatComposer.tsx`
- `web/src/pages/chat/ChatSlotStrip.tsx`
- `web/src/services/api/context.ts`
- `web/src/services/api/groups.ts`
- `web/src/stores/groupStoreCore.ts`
- `src/cccc/kernel/system_prompt.py`
- `src/cccc/ports/web/routes/*`

The exact implementation plan should be written next, but the central rule should remain unchanged: expose a new solo-first product model, reuse the collaboration kernel behind an adapter in V1, and do not leak collaboration concepts into the default user experience.
