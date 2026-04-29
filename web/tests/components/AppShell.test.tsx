// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Actor, GroupDoc, GroupMeta } from "../../src/types";

const uiState = vi.hoisted(() => ({
  chatDisplayMode: "chat" as "chat" | "terminal",
  workspaceInspectorOpen: true,
  workspaceInspectorWidth: 420,
  workspaceInspectorActiveTab: "files" as const,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue || _key,
  }),
}));

vi.mock("../../src/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../src/stores", () => ({
  useFormStore: (selector: (state: { setNewActorRole: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setNewActorRole: vi.fn() }),
  useModalStore: (selector: (state: { openModal: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ openModal: vi.fn() }),
}));

vi.mock("../../src/stores/useUIStore", () => ({
  SIDEBAR_COLLAPSED_WIDTH: 60,
  getChatSession: () => ({ chatDisplayMode: uiState.chatDisplayMode }),
  useUIStore: (
    selector: (state: {
      chatSessions: Record<string, unknown>;
      setChatDisplayMode: ReturnType<typeof vi.fn>;
      workspaceInspectorOpen: boolean;
      workspaceInspectorWidth: number;
      workspaceInspectorActiveTab: "files";
      setWorkspaceInspectorOpen: ReturnType<typeof vi.fn>;
      setWorkspaceInspectorWidth: ReturnType<typeof vi.fn>;
      setWorkspaceInspectorActiveTab: ReturnType<typeof vi.fn>;
      toggleWorkspaceInspector: ReturnType<typeof vi.fn>;
    }) => unknown,
  ) =>
    selector({
      chatSessions: {},
      setChatDisplayMode: vi.fn(),
      workspaceInspectorOpen: uiState.workspaceInspectorOpen,
      workspaceInspectorWidth: uiState.workspaceInspectorWidth,
      workspaceInspectorActiveTab: uiState.workspaceInspectorActiveTab,
      setWorkspaceInspectorOpen: vi.fn(),
      setWorkspaceInspectorWidth: vi.fn(),
      setWorkspaceInspectorActiveTab: vi.fn(),
      toggleWorkspaceInspector: vi.fn(),
    }),
}));

vi.mock("../../src/components/layout/GroupSidebar", () => ({
  GroupSidebar: () => <aside data-testid="group-sidebar" />,
}));

vi.mock("../../src/components/layout/AppHeader", () => ({
  AppHeader: (props: { titleOverride?: string; subtitleOverride?: string }) => (
    <header data-testid="app-header" data-title={props.titleOverride || ""} data-subtitle={props.subtitleOverride || ""} />
  ),
}));

vi.mock("../../src/features/workspaceInspector/WorkspaceInspector", () => ({
  WorkspaceInspector: () => <aside data-testid="workspace-inspector" />,
}));

vi.mock("../../src/pages/chat", () => ({
  ChatTab: () => <section data-testid="chat-tab" />,
}));

vi.mock("../../src/pages/chat/TerminalDirectView", () => ({
  TerminalDirectView: () => <section data-testid="terminal-direct-view" />,
}));

vi.mock("../../src/pages/ActorTab", () => ({
  ActorTab: () => <section data-testid="actor-tab" />,
}));

vi.mock("../../src/pages/notes", () => ({
  NotesPage: () => <section data-testid="notes-page" />,
}));

vi.mock("../../src/pages/scripts", () => ({
  ScriptManagerPage: () => <section data-testid="scripts-page" />,
}));

vi.mock("../../src/components/modals/ModalFrame", () => ({
  ModalFrame: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-frame">{children}</div>,
}));

import { AppShell } from "../../src/components/app/AppShell";

function render(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
}

function buildAppShellProps(): React.ComponentProps<typeof AppShell> {
  const group: GroupMeta = { group_id: "group-1", title: "Group One" };
  const groupDoc: GroupDoc = { group_id: "group-1", title: "Group One" };
  return {
    orderedGroups: [group],
    archivedGroupIds: [],
    groups: [group],
    selectedGroupId: "group-1",
    groupDoc,
    groupContext: null,
    actors: [] as Actor[],
    runtimeActors: [] as Actor[],
    recipientActors: [] as Actor[],
    recipientActorsBusy: false,
    destGroupScopeLabel: "Group One",
    renderedActorIds: [],
    activeTab: "chat",
    busy: "",
    isTransitioning: false,
    sidebarOpen: true,
    sidebarCollapsed: false,
    sidebarWidth: 280,
    isDark: false,
    isSmallScreen: false,
    webReadOnly: false,
    selectedGroupRunning: false,
    selectedGroupRuntimeStatus: null,
    selectedGroupActorsHydrating: false,
    sseStatus: "connected",
    groupLabelById: { "group-1": "Group One" },
    mentionSelectedIndex: 0,
    showMentionMenu: false,
    composerRef: React.createRef<HTMLTextAreaElement>(),
    fileInputRef: React.createRef<HTMLInputElement>(),
    eventContainerRef: { current: null },
    contentRef: { current: null },
    chatAtBottomRef: { current: true },
    onSelectGroup: vi.fn(),
    onWarmGroup: vi.fn(),
    onCreateGroup: vi.fn(),
    onCloseSidebar: vi.fn(),
    onSelectNotes: vi.fn(),
    onToggleSidebar: vi.fn(),
    onResizeSidebar: vi.fn(),
    onReorderGroupsInSection: vi.fn(),
    onRenameGroup: vi.fn(),
    onArchiveGroup: vi.fn(),
    onRestoreGroup: vi.fn(),
    onDeleteGroup: vi.fn(),
    onOpenSidebar: vi.fn(),
    onOpenGroupEdit: vi.fn(),
    onOpenSearch: vi.fn(),
    onOpenContext: vi.fn(),
    onStartGroup: vi.fn(),
    onStopGroup: vi.fn(),
    onSetGroupState: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenMobileMenu: vi.fn(),
    onTabChange: vi.fn(),
    appendComposerFiles: vi.fn(),
    setMentionFilter: vi.fn(),
    setMentionSelectedIndex: vi.fn(),
    setShowMentionMenu: vi.fn(),
    getTermEpoch: vi.fn(() => 0),
    onToggleActorEnabled: vi.fn(),
    onRelaunchActor: vi.fn(),
    onEditActor: vi.fn(),
    onRemoveActor: vi.fn(),
    onOpenActorInbox: vi.fn(),
    onRefreshActors: vi.fn(),
    onTouchStart: vi.fn(),
    onTouchEnd: vi.fn(),
  };
}

describe("AppShell workspace inspector layout", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    uiState.chatDisplayMode = "chat";
    uiState.workspaceInspectorOpen = true;
    uiState.workspaceInspectorWidth = 420;
    uiState.workspaceInspectorActiveTab = "files";
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("keeps the header fixed above the desktop workspace split pane", () => {
    ({ container, root } = render(<AppShell {...buildAppShellProps()} />));

    const main = container?.querySelector("main");
    const header = container?.querySelector('[data-testid="app-header"]');
    const contentRow = container?.querySelector('[data-testid="app-shell-content-row"]');
    const contentPane = container?.querySelector('[data-testid="app-shell-content-pane"]');
    const workspaceInspector = container?.querySelector('[data-testid="workspace-inspector"]');

    expect(header?.parentElement).toBe(main);
    expect(header?.nextElementSibling).toBe(contentRow);
    expect(contentRow?.contains(contentPane || null)).toBe(true);
    expect(contentRow?.contains(workspaceInspector || null)).toBe(true);
    expect(contentPane?.contains(header || null)).toBe(false);
  });

  it("passes Script Manager subtitle to the page header, not the sidebar", () => {
    const props = buildAppShellProps();
    ({ container, root } = render(<AppShell {...props} activeTab="scripts" />));

    const header = container?.querySelector('[data-testid="app-header"]');

    expect(header?.getAttribute("data-title")).toBe("Script Manager");
    expect(header?.getAttribute("data-subtitle")).toBe("Reusable local commands");
  });

  it("passes Notes subtitle to the page header, not the sidebar", () => {
    const props = buildAppShellProps();
    ({ container, root } = render(<AppShell {...props} activeTab="notes" />));

    const header = container?.querySelector('[data-testid="app-header"]');

    expect(header?.getAttribute("data-title")).toBe("Notes");
    expect(header?.getAttribute("data-subtitle")).toBe("Scratchpad and local notes");
  });
});
