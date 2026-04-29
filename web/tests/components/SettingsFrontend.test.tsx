// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Actor } from "../../src/types";

const fetchWebAccessSession = vi.fn();
const fetchIMStatus = vi.fn();
const fetchActors = vi.fn();
const changeLanguage = vi.fn();

vi.mock("../../src/services/api", () => ({
  fetchWebAccessSession: (...args: unknown[]) => fetchWebAccessSession(...args),
  fetchIMStatus: (...args: unknown[]) => fetchIMStatus(...args),
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
});
