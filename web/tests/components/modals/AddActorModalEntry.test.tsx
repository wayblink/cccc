// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => ({
      addAiAgent: "Add Agent or Terminal",
      addActorSubtitle: "Choose whether to configure an AI agent or start a temporary terminal.",
      addActorEntryAiAgent: "AI Agent",
      addActorEntryAiAgentHint: "Configure a runtime-backed assistant.",
      addActorEntryTerminal: "Terminal",
      addActorEntryTerminalHint: "Create a temporary terminal instantly.",
      agentName: "Agent name",
      unicodeSupport: "unicode supported",
      leaveEmptyToUse: "Leave empty to use",
      role: "Role",
      foremanRole: "Foreman",
      foremanExists: "exists",
      peerRole: "Peer",
      needForemanFirst: "needs foreman",
      foremanLeads: "Foreman leads",
      firstAgentForeman: "First agent is foreman",
      roleNotes: "Role notes",
      roleNotesPlaceholder: "Notes",
      newActorRoleNotesHint: "Hint",
      sectionBasics: "Basics",
      addSectionBasicsHint: "Basics hint",
      addSectionBasicsHintInteractive: "Interactive basics hint",
      "common:cancel": "Cancel",
      sectionRuntime: "Runtime",
      sectionRuntimeHint: "Runtime hint",
      creationMode: "Creation mode",
      customAgent: "Custom agent",
      fromActorProfile: "From profile",
      aiRuntime: "AI runtime",
      addAgent: "Add Agent",
      adding: "Adding",
      "common:back": "Back",
    }[key] || options?.defaultValue || key),
  }),
}));

vi.mock("../../../src/components/ActorAvatarField", () => ({
  ActorAvatarField: () => <div data-testid="avatar-field" />,
}));

vi.mock("../../../src/components/RolePresetPicker", () => ({
  RolePresetPicker: () => <div data-testid="role-preset-picker" />,
}));

vi.mock("../../../src/components/CapabilityPicker", () => ({
  CapabilityPicker: () => <div data-testid="capability-picker" />,
}));

import { AddActorModal, type AddActorModalProps } from "../../../src/components/modals/AddActorModal";

function defaultProps(overrides: Partial<AddActorModalProps> = {}): AddActorModalProps {
  return {
    isOpen: true,
    isDark: false,
    busy: "",
    hasForeman: true,
    runtimes: [{ name: "codex", display_name: "Codex", available: true }],
    suggestedActorId: "codex-1",
    newActorId: "",
    setNewActorId: vi.fn(),
    newActorRole: "peer",
    setNewActorRole: vi.fn(),
    newActorUseProfile: false,
    setNewActorUseProfile: vi.fn(),
    newActorProfileId: "",
    setNewActorProfileId: vi.fn(),
    actorProfiles: [],
    actorProfilesBusy: false,
    newActorRuntime: "codex",
    setNewActorRuntime: vi.fn(),
    newActorRunner: "pty",
    setNewActorRunner: vi.fn(),
    newActorCommand: "",
    setNewActorCommand: vi.fn(),
    newActorUseDefaultCommand: true,
    setNewActorUseDefaultCommand: vi.fn(),
    newActorSecretsSetText: "",
    setNewActorSecretsSetText: vi.fn(),
    newActorCapabilityAutoloadText: "",
    setNewActorCapabilityAutoloadText: vi.fn(),
    newActorRoleNotes: "",
    setNewActorRoleNotes: vi.fn(),
    showAdvancedActor: false,
    setShowAdvancedActor: vi.fn(),
    addActorError: "",
    setAddActorError: vi.fn(),
    canAddActor: true,
    addActorDisabledReason: "",
    onAddActor: vi.fn(),
    onSaveAsProfile: vi.fn(),
    onClose: vi.fn(),
    onCancelAndReset: vi.fn(),
    onLaunchQuickTerminal: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("AddActorModal entry mode", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.scrollTo = vi.fn();
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

  it("opens on AI Agent vs Terminal choices before showing the agent form", async () => {
    const onLaunchQuickTerminal = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root?.render(<AddActorModal {...defaultProps({ onLaunchQuickTerminal })} />);
    });

    expect(container?.querySelector('[data-testid="add-actor-entry-ai"]')).toBeTruthy();
    expect(container?.querySelector('[data-testid="add-actor-entry-terminal"]')).toBeTruthy();
    expect(container?.textContent).toContain("Add Agent or Terminal");
    expect(container?.textContent).toContain("start a temporary terminal");
    expect(container?.textContent).not.toContain("Agent name");

    await act(async () => {
      (container?.querySelector('[data-testid="add-actor-entry-terminal"]') as HTMLButtonElement).click();
    });
    expect(onLaunchQuickTerminal).toHaveBeenCalledTimes(1);

    await act(async () => {
      (container?.querySelector('[data-testid="add-actor-entry-ai"]') as HTMLButtonElement).click();
    });
    expect(container?.textContent).toContain("Agent name");
    expect(container?.querySelector('[data-testid="add-actor-back-to-choice"]')).toBeTruthy();

    await act(async () => {
      (container?.querySelector('[data-testid="add-actor-back-to-choice"]') as HTMLButtonElement).click();
    });
    expect(container?.querySelector('[data-testid="add-actor-entry-ai"]')).toBeTruthy();
    expect(container?.querySelector('[data-testid="add-actor-entry-terminal"]')).toBeTruthy();
    expect(container?.textContent).not.toContain("Agent name");
  });

  it("hides coordination roles when the group is interactive", async () => {
    await act(async () => {
      root?.render(
        <AddActorModal
          {...defaultProps({
            onLaunchQuickTerminal: undefined,
            showCoordinationRoles: false,
          })}
        />
      );
    });

    expect(container?.textContent).toContain("Agent name");
    expect(container?.textContent).toContain("Interactive basics hint");
    expect(container?.textContent).not.toContain("Foreman");
    expect(container?.textContent).not.toContain("Peer");
    expect(container?.textContent).not.toContain("First agent is foreman");
    expect(container?.querySelector('[data-testid="role-preset-picker"]')).toBeTruthy();
  });

  it("keeps coordination roles visible when the group is collaboration mode", async () => {
    await act(async () => {
      root?.render(
        <AddActorModal
          {...defaultProps({
            onLaunchQuickTerminal: undefined,
            showCoordinationRoles: true,
          })}
        />
      );
    });

    expect(container?.textContent).toContain("Role");
    expect(container?.textContent).toContain("Foreman");
    expect(container?.textContent).toContain("Peer");
    expect(container?.textContent).toContain("Foreman leads");
  });
});
