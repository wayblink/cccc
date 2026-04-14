# Chat Notification Sound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-local, globally configurable chat return sound that previews on selection and plays for qualifying live agent replies in the currently open group.

**Architecture:** Keep the preference client-only and parallel to the existing text-scale pattern: a small utility module owns the sound catalog, normalization, storage, and URL resolution; a tiny audio helper owns playback. Thread the current preference from `App.tsx` into the desktop rail, mobile appearance section, and `useSSE`, and keep the live trigger logic in a pure helper beside other ledger-event predicates so the SSE path stays simple and testable.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest, Floating UI, i18next

---

## File Map

- Create: `docs/superpowers/plans/2026-04-13-chat-notification-sound.md`
- Create: `web/src/hooks/useChatNotificationSound.ts`
- Create: `web/src/utils/chatNotificationSound.ts`
- Create: `web/src/utils/chatNotificationAudio.ts`
- Create: `web/src/components/ChatNotificationSoundSwitcher.tsx`
- Create: `web/tests/utils/chatNotificationSound.test.ts`
- Modify: `web/src/types.ts`
- Modify: `web/src/hooks/useSSE.ts`
- Modify: `web/src/utils/ledgerEventHandlers.ts`
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/app/AppShell.tsx`
- Modify: `web/src/components/AppModals.tsx`
- Modify: `web/src/components/layout/AppHeader.tsx`
- Modify: `web/src/components/layout/MobileMenuSheet.tsx`
- Modify: `web/src/components/Icons.tsx`
- Modify: `web/src/i18n/locales/en/layout.json`
- Modify: `web/src/i18n/locales/zh/layout.json`
- Modify: `web/src/i18n/locales/ja/layout.json`
- Create: `web/public/sounds/abstract-sound1.wav`
- Create: `web/public/sounds/abstract-sound2.wav`
- Create: `web/public/sounds/abstract-sound3.wav`
- Create: `web/public/sounds/abstract-sound4.wav`
- Create: `web/public/sounds/cow-mooing.wav`
- Create: `web/public/sounds/fahhhhh.wav`
- Create: `web/public/sounds/phone-vibration.wav`
- Create: `web/public/sounds/rooster.wav`

### Task 1: Sound Catalog, Persistence, and Playback Helpers

**Files:**
- Create: `web/src/utils/chatNotificationSound.ts`
- Create: `web/src/utils/chatNotificationAudio.ts`
- Create: `web/tests/utils/chatNotificationSound.test.ts`
- Modify: `web/src/types.ts`

- [ ] **Step 1: Write the failing helper tests**

```ts
it("falls back to the default preference when persisted payload is malformed", () => {
  expect(readStoredChatNotificationSoundPreference()).toEqual(DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE);
});

it("keeps a valid soundId even when enabled is false", () => {
  expect(normalizeChatNotificationSoundPreference({ enabled: false, soundId: "rooster" })).toEqual({
    enabled: false,
    soundId: "rooster",
  });
});

it("resolves the built-in asset URL for a known sound", () => {
  expect(getChatNotificationSoundUrl("abstract-sound1")).toBe("/sounds/abstract-sound1.wav");
});
```

- [ ] **Step 2: Run the helper tests to verify RED**

Run: `cd web && npx vitest run tests/utils/chatNotificationSound.test.ts`

Expected: FAIL because the new helper modules and exports do not exist yet.

- [ ] **Step 3: Write the minimal helper implementation**

```ts
export const CHAT_NOTIFICATION_SOUND_IDS = [
  "abstract-sound1",
  "abstract-sound2",
  "abstract-sound3",
  "abstract-sound4",
  "cow-mooing",
  "fahhhhh",
  "phone-vibration",
  "rooster",
] as const;

export const DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE = {
  enabled: true,
  soundId: "abstract-sound1",
} as const;

export function getChatNotificationSoundUrl(soundId: ChatNotificationSoundId): string {
  return `/sounds/${soundId}.wav`;
}
```

Implement storage read/write helpers with normalization and a tiny `playChatNotificationSoundById()` helper that catches playback failures and only logs `console.warn`.

- [ ] **Step 4: Run the helper tests to verify GREEN**

Run: `cd web && npx vitest run tests/utils/chatNotificationSound.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

```bash
git add web/src/types.ts web/src/utils/chatNotificationSound.ts web/src/utils/chatNotificationAudio.ts web/tests/utils/chatNotificationSound.test.ts
git commit -m "feat: add chat notification sound helpers"
```

### Task 2: Live SSE Trigger Predicate and Browser Preference Hook

**Files:**
- Create: `web/src/hooks/useChatNotificationSound.ts`
- Modify: `web/src/utils/ledgerEventHandlers.ts`
- Modify: `web/src/hooks/useSSE.ts`
- Modify: `web/tests/utils/ledgerEventHandlers.test.ts`
- Test: `web/tests/utils/chatNotificationSound.test.ts`

- [ ] **Step 1: Write the failing trigger tests**

```ts
it("returns true for a live renderable non-user chat message in the selected group", () => {
  expect(shouldPlayChatNotificationSound({
    selectedGroupId: "g-1",
    event: {
      kind: "chat.message",
      group_id: "g-1",
      by: "peer",
      data: { text: "done" },
    },
  })).toBe(true);
});

it("returns false for placeholder or empty messages", () => {
  expect(shouldPlayChatNotificationSound({
    selectedGroupId: "g-1",
    event: {
      kind: "chat.message",
      group_id: "g-1",
      by: "peer",
      data: { pending_placeholder: true, text: "" },
    },
  })).toBe(false);
});
```

- [ ] **Step 2: Run the trigger tests to verify RED**

Run: `cd web && npx vitest run tests/utils/ledgerEventHandlers.test.ts tests/utils/chatNotificationSound.test.ts`

Expected: FAIL because `shouldPlayChatNotificationSound()` and the preference hook are not wired yet.

- [ ] **Step 3: Write the minimal trigger implementation**

```ts
export function shouldPlayChatNotificationSound(args: {
  selectedGroupId: string;
  event: LedgerEvent;
}): boolean {
  const groupId = String(args.event.group_id || "").trim();
  const by = String(args.event.by || "").trim();
  const data = args.event.data as ChatMessageData | undefined;
  if (String(args.event.kind || "") !== "chat.message") return false;
  if (!groupId || groupId !== String(args.selectedGroupId || "").trim()) return false;
  if (!by || by === "user") return false;
  if (Boolean(data?.pending_placeholder)) return false;
  return hasRenderableChatMessageContent(args.event);
}
```

Implement `useChatNotificationSound()` as a tiny state hook parallel to `useTextScale()`, then update `useSSE()` to accept the current preference and call the audio helper only on qualifying live SSE events.

- [ ] **Step 4: Run the trigger tests to verify GREEN**

Run: `cd web && npx vitest run tests/utils/ledgerEventHandlers.test.ts tests/utils/chatNotificationSound.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

```bash
git add web/src/hooks/useChatNotificationSound.ts web/src/hooks/useSSE.ts web/src/utils/ledgerEventHandlers.ts web/tests/utils/ledgerEventHandlers.test.ts web/tests/utils/chatNotificationSound.test.ts
git commit -m "feat: play notification sounds for live agent replies"
```

### Task 3: Desktop and Mobile Preference UI

**Files:**
- Create: `web/src/components/ChatNotificationSoundSwitcher.tsx`
- Modify: `web/src/components/Icons.tsx`
- Modify: `web/src/components/layout/AppHeader.tsx`
- Modify: `web/src/components/layout/MobileMenuSheet.tsx`
- Modify: `web/src/components/app/AppShell.tsx`
- Modify: `web/src/components/AppModals.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/i18n/locales/en/layout.json`
- Modify: `web/src/i18n/locales/zh/layout.json`
- Modify: `web/src/i18n/locales/ja/layout.json`

- [ ] **Step 1: Write the failing UI-facing tests first where behavior stays pure**

```ts
it("returns the current sound label from the catalog", () => {
  expect(getChatNotificationSoundOption("rooster")?.labelKey).toBe("chatNotificationSoundOptionRooster");
});

it("preserves the selected sound while disabled", () => {
  const next = normalizeChatNotificationSoundPreference({ enabled: false, soundId: "phone-vibration" });
  expect(next.soundId).toBe("phone-vibration");
});
```

Keep UI assertions anchored in pure helpers instead of brittle DOM tests.

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `cd web && npx vitest run tests/utils/chatNotificationSound.test.ts`

Expected: FAIL until the catalog metadata needed by the switcher exists.

- [ ] **Step 3: Write the minimal UI implementation**

```tsx
<ChatNotificationSoundSwitcher
  preference={chatNotificationSound}
  onPreferenceChange={setChatNotificationSound}
  onPreviewSound={previewChatNotificationSound}
  variant="rail"
/>
```

Build one reusable switcher with:
- rail popover for desktop header controls
- row / inline-expand mode for mobile appearance section
- immediate preview on sound selection
- enabled toggle plus selected sound label

Thread the hook through `App.tsx`, `AppShell.tsx`, `AppHeader.tsx`, `AppModals.tsx`, and `MobileMenuSheet.tsx`.

- [ ] **Step 4: Run the focused tests to verify GREEN**

Run: `cd web && npx vitest run tests/utils/chatNotificationSound.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

```bash
git add web/src/App.tsx web/src/components/AppModals.tsx web/src/components/ChatNotificationSoundSwitcher.tsx web/src/components/Icons.tsx web/src/components/app/AppShell.tsx web/src/components/layout/AppHeader.tsx web/src/components/layout/MobileMenuSheet.tsx web/src/i18n/locales/en/layout.json web/src/i18n/locales/zh/layout.json web/src/i18n/locales/ja/layout.json
git commit -m "feat: add chat notification sound controls"
```

### Task 4: Static Assets and Final Verification

**Files:**
- Create: `web/public/sounds/*.wav`
- Modify: `docs/superpowers/plans/2026-04-13-chat-notification-sound.md`

- [ ] **Step 1: Copy the built-in sound assets from the local reference repo**

```bash
mkdir -p web/public/sounds
cp /Users/jyxc-dz-0101035/yard/vibe-kanban/assets/sounds/*.wav web/public/sounds/
```

- [ ] **Step 2: Run focused verification**

Run:

```bash
cd web && npx vitest run tests/utils/chatNotificationSound.test.ts tests/utils/ledgerEventHandlers.test.ts tests/stores/useUIStore.test.ts tests/pages/chat/chatTypographyScale.test.ts
cd web && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run a quick manual smoke check**

Run:

```bash
cd web && npm run dev -- --host 127.0.0.1 --port 5174
```

Verify:
- desktop rail shows the new notification-sound control
- mobile menu shows `外观 -> 通知音`
- selecting a sound previews immediately
- disabling keeps the selected sound label
- a live agent reply in the selected group plays the chosen sound once

- [ ] **Step 4: Stage the plan doc and implementation**

```bash
git add -f docs/superpowers/plans/2026-04-13-chat-notification-sound.md
git add web/public/sounds web/src web/tests
git status --short
```

- [ ] **Step 5: Commit the completed feature**

```bash
git commit -m "feat: add chat notification sounds"
```
