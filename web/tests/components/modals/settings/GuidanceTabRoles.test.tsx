// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; kind?: string }) => ({
      "guidance.commonNotesTitle": "Common Notes",
      "guidance.commonNotesHint": "Shared help.",
      "guidance.commonNotesPlaceholder": "Common...",
      "guidance.foremanNotesTitle": "Foreman Notes",
      "guidance.foremanNotesHint": "Only foreman actors receive this scoped block.",
      "guidance.foremanNotesPlaceholder": "Foreman...",
      "guidance.peerNotesTitle": "Peer Notes",
      "guidance.peerNotesHint": "Only peer actors receive this scoped block.",
      "guidance.peerNotesPlaceholder": "Peer...",
      "guidance.petPersonaTitle": "Pet Persona",
      "guidance.petPersonaHint": "Pet persona.",
      "guidance.petPersonaPlaceholder": "Pet...",
      "guidance.petPersonaBadge": "Web Pet",
      "guidance.actorNotesTitle": "Actor Notes",
      "guidance.actorNotesHint": "Actor help.",
      "guidance.actorNotePlaceholder": "Actor...",
      "guidance.noActorsForStructuredHelp": "No actors",
      "guidance.helpTitle": "Help",
      "guidance.helpHint": "Help hint",
      "guidance.helpEditorHint": "Structured mode edits common, role, and actor notes.",
      "guidance.helpEditorHintInteractive": "Structured mode edits common and actor notes.",
      "guidance.structuredView": "Structured",
      "guidance.rawView": "Raw Markdown",
      "guidance.editKind": `Editing ${options?.kind || ""}`,
      "guidance.markdown": "Markdown",
      "guidance.expand": "Expand",
      "guidance.expandTitle": "Expand",
      "guidance.orphanActorRole": "No longer in group",
      "guidance.unknownRole": "Unknown",
      "common:close": "Close",
    }[key] || options?.defaultValue || key),
  }),
}));

vi.mock("../../../../src/services/api", () => ({
  fetchGroupPrompts: vi.fn().mockResolvedValue({
    ok: true,
    result: {
      preamble: { path: "CCCC_PREAMBLE.md", content: "" },
      help: { path: "CCCC_HELP.md", content: "" },
    },
  }),
  fetchActors: vi.fn().mockResolvedValue({
    ok: true,
    result: {
      actors: [
        { id: "alpha", role: "foreman", runtime: "codex" },
        { id: "beta", role: "peer", runtime: "codex" },
      ],
    },
  }),
  updateGroupPrompt: vi.fn().mockResolvedValue({ ok: true }),
}));

import { GuidanceTab } from "../../../../src/components/modals/settings/GuidanceTab";

function flushEffects() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("GuidanceTab role wording", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("hides role-scoped guidance controls when coordination roles are hidden", async () => {
    await act(async () => {
      root?.render(<GuidanceTab isDark={false} groupId="group-1" showCoordinationRoles={false} />);
    });
    await flushEffects();

    expect(container?.textContent).toContain("Structured mode edits common and actor notes.");
    expect(container?.textContent).toContain("Common Notes");
    expect(container?.textContent).toContain("Actor Notes");
    expect(container?.textContent).toContain("alpha");
    expect(container?.textContent).toContain("beta");
    expect(container?.textContent).not.toContain("Foreman Notes");
    expect(container?.textContent).not.toContain("Peer Notes");
    expect(container?.textContent).not.toContain("foreman");
    expect(container?.textContent).not.toContain("peer");
  });

  it("keeps role-scoped guidance controls when coordination roles are visible", async () => {
    await act(async () => {
      root?.render(<GuidanceTab isDark={false} groupId="group-1" showCoordinationRoles={true} />);
    });
    await flushEffects();

    expect(container?.textContent).toContain("Foreman Notes");
    expect(container?.textContent).toContain("Peer Notes");
    expect(container?.textContent).toContain("foreman");
    expect(container?.textContent).toContain("peer");
  });
});
