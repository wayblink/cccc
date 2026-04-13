# Chat Notification Sound Design

Date: 2026-04-13
Status: Approved in chat

## Goal

Add a configurable chat return sound for the CCCC web UI so that when an agent posts a new renderable chat message in the currently open group, the browser can play a short notification sound.

V1 is intentionally a browser-local preference, not a server-backed or group-scoped setting.

## Confirmed Product Decisions

- V1 does **not** get a standalone configuration page
- Desktop entry lives in the header rail, alongside theme, text size, and language
- Mobile entry lives in `菜单 -> 外观`
- Configuration is stored only in browser `localStorage`
- Configuration shape is:
  - `enabled`
  - `soundId`
- V1 supports multiple built-in sounds
- Built-in sounds are copied from local `../vibe-kanban/assets/sounds`
- First-run default is:
  - `enabled: true`
  - `soundId: abstract-sound1`
- Sound plays only for new live `chat.message` events from non-user senders in the currently selected group
- Do not play for:
  - user-authored messages
  - history hydration
  - placeholder / empty / non-renderable messages
  - background traffic from other groups

## UX Surface

### Desktop

The desktop UI adds a local notification-sound control to the existing header rail.

- visual position: next to theme / text size / language controls
- trigger: speaker / volume icon
- interaction: clicking the icon opens a small popover
- popover contents:
  - master enable switch
  - sound picker list
  - current sound label
  - preview action when selecting a sound

This keeps the feature grouped with other browser-local preferences instead of mixing it into group/server settings.

### Mobile

The mobile UI adds a new `通知音` row inside the existing `外观` section in `Mobile Menu`.

- row shows current state:
  - selected sound label when enabled
  - `已关闭` when disabled
- tapping the row expands inline to show the same controls:
  - master enable switch
  - sound picker list
  - preview on selection

V1 does not introduce a separate mobile settings page.

## Sound Catalog

V1 ships these built-in sound options:

- `abstract-sound1`
- `abstract-sound2`
- `abstract-sound3`
- `abstract-sound4`
- `cow-mooing`
- `fahhhhh`
- `phone-vibration`
- `rooster`

The web app should serve them as static assets under the frontend public path instead of proxying through a backend API.

## Local State and Persistence

The feature uses a browser-local preference object, parallel to the existing text-scale preference pattern.

### Stored Shape

`ChatNotificationSoundPreference`

- `enabled: boolean`
- `soundId: ChatNotificationSoundId`

### Persistence Rules

- store in `localStorage`
- sanitize invalid or missing values through a small normalize helper
- unknown `soundId` falls back to `abstract-sound1`
- malformed payload falls back to the full default object

### Scope

- preference is global for the current browser profile
- the same preference applies to every group in this browser
- there is no server sync, no per-group override, and no multi-device sync in V1

## Trigger Rules

Sound playback should be driven from the live SSE path, not from history loaders and not from unread bookkeeping.

Play a sound only when all of these are true:

- event is a live SSE `chat.message`
- event belongs to the currently selected group stream
- `by !== "user"`
- message content is renderable:
  - non-empty text, or
  - attachments, or
  - refs
- the preference is enabled

Do not require:

- chat tab to be scrolled away from bottom
- main app tab to currently equal `chat`
- unread count to increment
- attention priority

Do not play for:

- initial ledger/history fetch
- reconnect hydration of already-rendered history
- empty placeholder messages
- transient streaming placeholders before the canonical renderable reply arrives

## Playback Behavior

Use a single frontend helper to resolve the selected sound asset URL and attempt playback.

### Browser Path

- use browser audio playback directly
- failed playback should be caught and logged with a low-noise `console.warn`
- playback failure must never interrupt chat rendering or SSE handling

### Preview Path

- when the user selects a sound in the UI, immediately preview that sound
- preview respects the newly selected value even before the popover closes
- selecting a sound updates stored `soundId` even if `enabled` is currently off
- preview is the main way to confirm the choice and also helps unlock later autoplay in browsers that require prior user interaction

## Why This Is Not In Settings Modal

The current settings modal is primarily oriented around group-level and server-backed configuration. This feature is neither.

Putting notification sound into the header/mobile appearance surfaces keeps the meaning clear:

- local to the browser
- personal preference
- fast to reach
- aligned with theme / text size / language

If a broader `Appearance` or `Local Preferences` settings section is added later, this control can move there in V2 without changing the V1 data model.

## V1 Scope

### Included

- desktop header-rail notification sound control
- mobile `外观` notification sound control
- browser-local persistence
- built-in sound selection
- enable / disable toggle
- immediate sound preview on selection
- live playback for qualifying incoming agent messages in the selected group

### Excluded

- standalone configuration page
- server-backed settings
- per-group sound preferences
- per-actor sound preferences
- custom uploaded sounds
- volume slider
- cross-group background notifications
- sound for user-authored messages
- sound for non-chat events

## Testing Strategy

Add focused coverage for:

- preference normalization and default fallback
- invalid persisted payload recovery
- sound trigger predicate behavior
- qualifying non-user renderable message returns `true`
- user-authored message returns `false`
- empty / placeholder message returns `false`

Implementation tests should prefer pure helpers where possible so the playback rules stay easy to verify without driving full SSE integration in every case.

## Implementation Notes

Primary integration points:

- `web/src/hooks/useSSE.ts`
- `web/src/utils/ledgerEventHandlers.ts`
- `web/src/utils/textScale.ts`
- `web/src/hooks/useTextScale.ts`
- `web/src/components/TextScaleSwitcher.tsx`
- `web/src/components/layout/AppHeader.tsx`
- `web/src/components/layout/MobileMenuSheet.tsx`
- `web/src/stores/useUIStore.ts`
- `web/src/i18n/locales/*/layout.json`
- `web/public/sounds/*.wav`

Likely new frontend pieces:

- notification-sound preference utility
- playback helper
- desktop switcher / popover component
- mobile row variant

The implementation should follow the existing local-preference style used by text scale rather than introducing a new server settings pathway.
