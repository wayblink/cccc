// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Actor } from "../../src/types";

const fetchWebAccessSession = vi.fn();
const fetchIMStatus = vi.fn();
const fetchIMConfig = vi.fn();
const fetchActors = vi.fn();
const changeLanguage = vi.fn();

vi.mock("../../src/services/api", () => ({
  fetchWebAccessSession: (...args: unknown[]) => fetchWebAccessSession(...args),
  fetchIMStatus: (...args: unknown[]) => fetchIMStatus(...args),
  fetchIMConfig: (...args: unknown[]) => fetchIMConfig(...args),
  fetchActors: (...args: unknown[]) => fetchActors(...args),
}));

vi.mock("../../src/hooks/useModalA11y", () => ({
  useModalA11y: () => ({ modalRef: { current: null } }),
}));

vi.mock("../../src/stores", () => ({
  useObservabilityStore: {
    getState: () => ({
      setFromObs: vi.fn(),
    }),
  },
}));

vi.mock("react-i18next", () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  useTranslation: () => ({
    i18n: {
      resolvedLanguage: "en",
      language: "en",
      changeLanguage,
    },
    t: (key: string, options?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        title: "Settings",
        closeAriaLabel: "Close settings",
        "tabs.frontend": "Frontend Settings",
        "tabs.guidance": "Guidance",
        "tabs.assistants": "Assistant",
        "tabs.automation": "Automation",
        "tabs.delivery": "Delivery",
        "tabs.space": "Notebook",
        "tabs.messaging": "Messaging",
        "tabs.im": "IM Bridge",
        "tabs.transcript": "Transcript",
        "tabs.blueprint": "Blueprint",
        "tabs.advanced": "Advanced",
        "tabs.capabilities": "Capability Governance",
        "tabs.actorProfiles": "Actor Profiles",
        "tabs.myProfiles": "My Profiles",
        "tabs.branding": "Branding",
        "tabs.webAccess": "Web Access",
        "tabs.developer": "Developer",
        "navigation.targetScope": "Target scope",
        "navigation.thisGroup": "This group",
        "navigation.global": "Global",
        "navigation.groupScopeTitle": "Group settings",
        "navigation.groupScopeContent": "Settings for this group",
        "navigation.globalScopeTitle": "Global settings",
        "navigation.globalScopeContent": "Global settings",
        "navigation.globalLockedTitle": "Global settings locked",
        "navigation.globalLockedContent": "Global backend settings are locked.",
        "navigation.sections": "Sections",
        "frontend.title": "Frontend Settings",
        "frontend.description": "Local browser preferences.",
        "frontend.localOnlyTitle": "Stored in this browser",
        "frontend.localOnlyDescription": "These preferences only affect this device.",
        "frontend.themeTitle": "Theme",
        "frontend.textScaleTitle": "Text scale",
        "frontend.notificationSoundTitle": "Notification sound",
        "frontend.languageTitle": "Language",
        "advanced.title": "Advanced Group Settings",
        "advanced.description": "Group-specific policies and maintenance tools.",
        "delivery.title": "Delivery",
        "delivery.description": "Configure read cursor behavior.",
        "delivery.autoMarkRead": "Auto mark on delivery",
        "delivery.autoMarkReadHelp": "Mark delivered items as read automatically.",
        "delivery.saveDelivery": "Save delivery settings",
        "transcript.title": "Terminal transcript",
        "transcript.description": "Readable tail for troubleshooting.",
        "transcript.policy": "Policy",
        "transcript.visibilityLabel": "Visibility to agents",
        "transcript.visibilityOff": "off",
        "transcript.visibilityForeman": "foreman",
        "transcript.visibilityDefaultActor": "default actor",
        "transcript.visibilityAll": "all",
        "transcript.visibilityTip": "Only affects agents.",
        "transcript.includeTail": "Include tail in idle notifications",
        "transcript.notificationLines": "Notification lines",
        "transcript.saveTranscript": "Save transcript settings",
        "blueprint.exportTitle": "Export blueprint",
        "blueprint.title": "Blueprint maintenance",
        "blueprint.description": "Export or replace this group from a portable blueprint file.",
        "blueprint.exportDescription": "Download this group as a blueprint.",
        "blueprint.importTitle": "Import blueprint",
        "blueprint.importDescription": "Preview and replace this group from a blueprint.",
        "blueprint.blueprintFile": "Blueprint file",
        "blueprint.exportBlueprint": "Export blueprint",
        "blueprint.applyReplace": "Apply replace",
        themeLight: "Light",
        themeDark: "Dark",
        themeSystem: "System",
        switchToTheme: `Switch to ${String(options?.theme || "")}`,
        currentTheme: `Current theme: ${String(options?.theme || "")}`,
        textSizeLabel: "Text Size",
        currentTextSize: `Current text size: ${String(options?.percent || "")}`,
        switchTextSize: `Switch text size to ${String(options?.percent || "")}`,
        chatNotificationSoundLabel: "Notification Sound",
        chatNotificationSoundEnabled: "Enabled",
        chatNotificationSoundDisabled: "Disabled",
        chatNotificationSoundSummary: `${String(options?.status || "")}, ${String(options?.sound || "")}`,
        chatNotificationSoundOptionAbstractSound1: "Soft pulse",
        chatNotificationSoundSelectHint: "Choose a sound",
        "common:language": "Language",
        "common:languageEnglish": "English",
        "layout:currentLanguage": `Current language: ${String(options?.language || "")}`,
        searchMessages: "Search Messages",
        context: "Context",
        settings: "Settings",
        selectGroup: "Select group",
        launchAllAgents: "Launch all agents",
        stopAllAgents: "Stop all agents",
        pauseDelivery: "Pause delivery",
        resumeDelivery: "Resume delivery",
        terminalModeUnavailable: "Terminal unavailable",
        switchToChatMode: "Switch to chat",
        switchToTerminalMode: "Switch to terminal",
        workspaceInspectorOpen: "Open workspace inspector",
        workspaceInspectorClose: "Close workspace inspector",
      };
      return labels[key] || key;
    },
  }),
}));

import { AppHeader } from "../../src/components/layout/AppHeader";
import { SettingsModal } from "../../src/components/SettingsModal";
import { SettingsIcon } from "../../src/components/Icons";

function render(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
}

describe("frontend settings chrome", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Element.prototype.scrollTo = vi.fn();
    fetchWebAccessSession.mockReset();
    fetchIMStatus.mockReset();
    fetchIMConfig.mockReset();
    fetchActors.mockReset();
    fetchWebAccessSession.mockResolvedValue({
      ok: true,
      result: {
        web_access_session: {
          login_active: true,
          current_browser_signed_in: false,
          can_access_global_settings: false,
        },
      },
    });
    fetchIMStatus.mockResolvedValue({ ok: true, result: { status: null } });
    fetchIMConfig.mockResolvedValue({ ok: true, result: { im: null } });
    fetchActors.mockResolvedValue({ ok: true, result: { actors: [] } });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    document.body.innerHTML = "";
  });

  it("keeps local frontend preferences available when backend global settings are locked", async () => {
    ({ container, root } = render(
      <SettingsModal
        isOpen
        onClose={vi.fn()}
        settings={null}
        onUpdateSettings={vi.fn()}
        busy={false}
        isDark={false}
        theme="light"
        onThemeChange={vi.fn()}
        textScale={100}
        onTextScaleChange={vi.fn()}
        chatNotificationSound={{ enabled: true, soundId: "abstract-sound1" }}
        onChatNotificationSoundChange={vi.fn()}
        onPreviewChatNotificationSound={vi.fn()}
      />,
    ));

    expect(container?.textContent).toContain("Frontend Settings");
    expect(container?.textContent).toContain("Local browser preferences.");
    expect(container?.textContent).not.toContain("Global backend settings are locked.");
  });

  it("opens on the global frontend settings page even from a selected group", async () => {
    ({ container, root } = render(
      <SettingsModal
        isOpen
        onClose={vi.fn()}
        settings={null}
        onUpdateSettings={vi.fn()}
        busy={false}
        isDark={false}
        theme="light"
        onThemeChange={vi.fn()}
        textScale={100}
        onTextScaleChange={vi.fn()}
        chatNotificationSound={{ enabled: true, soundId: "abstract-sound1" }}
        onChatNotificationSoundChange={vi.fn()}
        onPreviewChatNotificationSound={vi.fn()}
        groupId="group-1"
        groupDoc={{ group_id: "group-1", title: "Group One" }}
      />,
    ));

    await act(async () => {
      await vi.dynamicImportSettled();
    });

    expect(container?.textContent).toContain("Frontend Settings");
    expect(container?.textContent).toContain("Local browser preferences.");
  });

  it("groups technical group-only controls under Advanced", async () => {
    ({ container, root } = render(
      <SettingsModal
        isOpen
        onClose={vi.fn()}
        settings={null}
        onUpdateSettings={vi.fn()}
        busy={false}
        isDark={false}
        theme="light"
        onThemeChange={vi.fn()}
        textScale={100}
        onTextScaleChange={vi.fn()}
        chatNotificationSound={{ enabled: true, soundId: "abstract-sound1" }}
        onChatNotificationSoundChange={vi.fn()}
        onPreviewChatNotificationSound={vi.fn()}
        groupId="group-1"
        groupDoc={{ group_id: "group-1", title: "Group One" }}
      />,
    ));

    await act(async () => {
      await vi.dynamicImportSettled();
    });

    await act(async () => {
      const groupButton = Array.from(container?.querySelectorAll("button") || []).find(
        (button) => button.textContent?.includes("This group"),
      );
      groupButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const navLabels = Array.from(container?.querySelectorAll("nav button") || []).map((button) => button.textContent?.trim());
    expect(navLabels).toContain("Advanced");
    expect(navLabels).not.toContain("Delivery");
    expect(navLabels).not.toContain("Transcript");
    expect(navLabels).not.toContain("Blueprint");

    await act(async () => {
      const advancedButton = Array.from(container?.querySelectorAll("button") || []).find(
        (button) => button.textContent?.trim() === "Advanced",
      );
      advancedButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(container?.textContent).toContain("Advanced Group Settings");
    expect(container?.textContent).toContain("Delivery");
    expect(container?.textContent).toContain("Policy");
    expect(container?.textContent).toContain("Export blueprint");
    expect(container?.textContent).not.toContain("Tail viewer");
  });

  it("removes quick frontend controls from the header while keeping Settings", () => {
    ({ container, root } = render(
      <AppHeader
        isDark={false}
        theme="light"
        textScale={100}
        chatNotificationSound={{ enabled: true, soundId: "abstract-sound1" }}
        onThemeChange={vi.fn()}
        onTextScaleChange={vi.fn()}
        onChatNotificationSoundChange={vi.fn()}
        onPreviewChatNotificationSound={vi.fn()}
        selectedGroupId="group-1"
        groupDoc={{ group_id: "group-1", title: "Group One" }}
        selectedGroupRunning={false}
        selectedGroupRuntimeStatus={null}
        actors={[] as Actor[]}
        sseStatus="connected"
        busy=""
        onOpenSidebar={vi.fn()}
        onOpenSearch={vi.fn()}
        onOpenContext={vi.fn()}
        onStartGroup={vi.fn()}
        onStopGroup={vi.fn()}
        onSetGroupState={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenMobileMenu={vi.fn()}
      />,
    ));

    const chromeLabels = Array.from(container?.querySelectorAll("button") || []).map(
      (button) => `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`,
    );
    expect(chromeLabels.some((label) => label.includes("Settings"))).toBe(true);
    expect(chromeLabels.some((label) => label.includes("Current theme"))).toBe(false);
    expect(chromeLabels.some((label) => label.includes("Current text size"))).toBe(false);
    expect(chromeLabels.some((label) => label.includes("Notification Sound"))).toBe(false);
    expect(chromeLabels.some((label) => label.includes("Current language"))).toBe(false);
  });

  it("uses the gear Settings icon instead of the sliders icon", () => {
    ({ container, root } = render(<SettingsIcon size={24} />));

    expect(container?.querySelector('circle[cx="12"][cy="12"][r="3"]')).toBeTruthy();
    expect(container?.querySelector('circle[cx="7"][cy="7"]')).toBeNull();
    expect(container?.querySelector('circle[cx="17"][cy="17"]')).toBeNull();
  });

  it("orders the desktop header actions with utility tools before the runtime controls", () => {
    ({ container, root } = render(
      <AppHeader
        selectedGroupId="group-1"
        groupDoc={{ group_id: "group-1", title: "Group One" }}
        selectedGroupRunning
        selectedGroupRuntimeStatus={{
          lifecycle_state: "active",
          runtime_running: true,
          running_actor_count: 1,
          has_running_foreman: false,
        }}
        actors={[{ id: "actor-1" }] as Actor[]}
        sseStatus="connected"
        busy=""
        onOpenSidebar={vi.fn()}
        onOpenSearch={vi.fn()}
        onOpenContext={vi.fn()}
        onStartGroup={vi.fn()}
        onStopGroup={vi.fn()}
        onSetGroupState={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenMobileMenu={vi.fn()}
        hasTerminalActors
        onToggleChatDisplayMode={vi.fn()}
        onToggleWorkspaceInspector={vi.fn()}
      />,
    ));

    const expectedOrder = [
      "Open workspace inspector",
      "Switch to terminal",
      "Search Messages",
      "Context",
      "Pause delivery",
      "Stop all agents",
      "Settings",
    ];
    const actualOrder = Array.from(container?.querySelectorAll("header button") || [])
      .map((button) => button.getAttribute("title") || button.getAttribute("aria-label") || "")
      .filter((label) => expectedOrder.includes(label));
    expect(actualOrder).toEqual(expectedOrder);

    const contextButton = Array.from(container?.querySelectorAll("header button") || []).find(
      (button) => button.getAttribute("title") === "Context",
    );
    const separator = contextButton?.nextElementSibling;
    expect(separator?.tagName).toBe("SPAN");
    expect(separator?.className).toContain("w-px");
    expect(separator?.nextElementSibling?.getAttribute("title")).toBe("Pause delivery");
  });

  it("gives the open workspace button the same pressed control affordance as Stop", () => {
    ({ container, root } = render(
      <AppHeader
        selectedGroupId="group-1"
        groupDoc={{ group_id: "group-1", title: "Group One" }}
        selectedGroupRunning={false}
        selectedGroupRuntimeStatus={{
          lifecycle_state: "stopped",
          runtime_running: false,
          running_actor_count: 0,
          has_running_foreman: false,
        }}
        actors={[] as Actor[]}
        sseStatus="connected"
        busy=""
        onOpenSidebar={vi.fn()}
        onOpenSearch={vi.fn()}
        onOpenContext={vi.fn()}
        onStartGroup={vi.fn()}
        onStopGroup={vi.fn()}
        onSetGroupState={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenMobileMenu={vi.fn()}
        workspaceInspectorOpen
        onToggleWorkspaceInspector={vi.fn()}
      />,
    ));

    const workspaceButton = Array.from(container?.querySelectorAll("header button") || []).find(
      (button) => button.getAttribute("aria-label") === "Close workspace inspector",
    );
    const stopButton = Array.from(container?.querySelectorAll("header button") || []).find(
      (button) => button.getAttribute("title") === "Stop all agents",
    );
    expect(workspaceButton?.getAttribute("aria-pressed")).toBe("true");
    expect(stopButton?.getAttribute("aria-pressed")).toBe("true");
    expect(workspaceButton?.className).toContain("text-white");
    expect(workspaceButton?.className).toContain("ring-1");
    expect(workspaceButton?.className).toContain("shadow-[0_10px_24px_rgba");
  });
});
