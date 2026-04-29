// UI state store (tabs, sidebar, toasts, etc.).
import { create } from "zustand";
import { clampPresentationSplitWidth, PRESENTATION_SPLIT_DEFAULT_WIDTH } from "../utils/presentationSplitLayout";
import type { WorkspaceInspectorTab } from "../features/workspaceInspector/workspaceTypes";

export const SIDEBAR_COLLAPSED_WIDTH = 60;
export const SIDEBAR_DEFAULT_WIDTH = 280;
export const SIDEBAR_MIN_WIDTH = 280;
export const SIDEBAR_MAX_WIDTH = 480;
export const WORKSPACE_INSPECTOR_MIN_WIDTH = 320;
export const WORKSPACE_INSPECTOR_MAX_WIDTH = 720;
export const WORKSPACE_INSPECTOR_DEFAULT_WIDTH = 420;

interface UINotice {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export type ChatFilter = "all" | "user" | "attention" | "task";
export type ChatFollowMode = "follow" | "detached";
export type ChatSlotId = "all" | `agent:${string}`;

export interface ChatScrollSnapshot {
  mode: ChatFollowMode;
  anchorId: string;
  offsetPx: number;
  updatedAt: number;
}

export interface ChatSlotState {
  scrollSnapshot: ChatScrollSnapshot | null;
  lastViewedAt: number;
}

export interface ChatSessionState {
  showScrollButton: boolean;
  chatUnreadCount: number;
  chatFilter: ChatFilter;
  selectedSlotId: ChatSlotId;
  slotStates: Record<string, ChatSlotState>;
  scrollSnapshot: ChatScrollSnapshot | null;
  mobileSurface: "messages" | "presentation";
  presentationDockOpen: boolean;
  presentationDisplayMode: "modal" | "split";
  chatDisplayMode: "chat" | "terminal";
  chatDisplayModeExplicit: boolean;
}

const DEFAULT_CHAT_SLOT_STATE: ChatSlotState = {
  scrollSnapshot: null,
  lastViewedAt: 0,
};

const DEFAULT_CHAT_SESSION: ChatSessionState = {
  showScrollButton: false,
  chatUnreadCount: 0,
  chatFilter: "all",
  selectedSlotId: "all",
  slotStates: {},
  scrollSnapshot: null,
  mobileSurface: "messages",
  presentationDockOpen: false,
  presentationDisplayMode: "modal",
  chatDisplayMode: "chat",
  chatDisplayModeExplicit: false,
};

export function buildAgentChatSlotId(actorId: string | null | undefined): ChatSlotId {
  const normalizedActorId = String(actorId || "").trim();
  return normalizedActorId ? `agent:${normalizedActorId}` : "all";
}

export function parseChatSlotActorId(slotId: string | null | undefined): string | null {
  const normalizedSlotId = String(slotId || "").trim();
  if (!normalizedSlotId.startsWith("agent:")) return null;
  const actorId = normalizedSlotId.slice("agent:".length).trim();
  return actorId || null;
}

export function sanitizeChatSlotId(value: unknown): ChatSlotId {
  const normalized = String(value || "").trim();
  if (normalized === "all") return "all";
  const actorId = parseChatSlotActorId(normalized);
  return actorId ? `agent:${actorId}` : "all";
}

function sanitizeChatSlotState(value: unknown): ChatSlotState | null {
  if (!value || typeof value !== "object") return null;
  const slotState = value as {
    scrollSnapshot?: unknown;
    lastViewedAt?: unknown;
  };
  return {
    scrollSnapshot: sanitizeChatScrollSnapshot(slotState.scrollSnapshot),
    lastViewedAt: Number.isFinite(Number(slotState.lastViewedAt)) ? Math.max(0, Number(slotState.lastViewedAt)) : 0,
  };
}

function sanitizeChatSlotStates(value: unknown): Record<string, ChatSlotState> {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const next: Record<string, ChatSlotState> = {};
  for (const [slotId, raw] of Object.entries(input)) {
    const normalizedSlotId = sanitizeChatSlotId(slotId);
    const slotState = sanitizeChatSlotState(raw);
    if (!slotState) continue;
    next[normalizedSlotId] = slotState;
  }
  return next;
}

function getSessionSlotState(session: Pick<ChatSessionState, "slotStates">, slotId: ChatSlotId): ChatSlotState {
  return session.slotStates[slotId] || DEFAULT_CHAT_SLOT_STATE;
}

function materializeChatSession(session: Partial<ChatSessionState>): ChatSessionState {
  const selectedSlotId = sanitizeChatSlotId(session.selectedSlotId);
  const slotStates = sanitizeChatSlotStates(session.slotStates);
  const selectedSlotState = getSessionSlotState({ slotStates }, selectedSlotId);
  return {
    ...DEFAULT_CHAT_SESSION,
    ...session,
    selectedSlotId,
    slotStates,
    scrollSnapshot: selectedSlotState.scrollSnapshot,
  };
}

export function getChatSession(groupId: string | null | undefined, sessions: Record<string, ChatSessionState>): ChatSessionState {
  const gid = String(groupId || "").trim();
  if (!gid) return DEFAULT_CHAT_SESSION;
  return materializeChatSession(sessions[gid] || DEFAULT_CHAT_SESSION);
}

export function getChatSlotState(
  groupId: string | null | undefined,
  slotId: ChatSlotId,
  sessions: Record<string, ChatSessionState>,
): ChatSlotState {
  const session = getChatSession(groupId, sessions);
  return getSessionSlotState(session, sanitizeChatSlotId(slotId));
}

export function getChatSlotLastViewedAt(
  groupId: string | null | undefined,
  slotId: ChatSlotId,
  sessions: Record<string, ChatSessionState>,
): number {
  return getChatSlotState(groupId, slotId, sessions).lastViewedAt;
}

interface UIState {
  // State
  activeTab: string;
  busy: string;
  errorMsg: string;
  notice: UINotice | null;
  isTransitioning: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean; // Desktop sidebar collapsed state
  sidebarWidth: number;
  isSmallScreen: boolean;
  presentationSplitWidth: number;
  workspaceInspectorOpen: boolean;
  workspaceInspectorWidth: number;
  workspaceInspectorActiveTab: WorkspaceInspectorTab;
  chatSessions: Record<string, ChatSessionState>;
  webReadOnly: boolean;
  sseStatus: "connected" | "connecting" | "disconnected";

  // Actions
  setActiveTab: (tab: string) => void;
  setBusy: (busy: string) => void;
  setError: (msg: string) => void;
  showError: (msg: string) => void;
  dismissError: () => void;
  showNotice: (notice: UINotice) => void;
  dismissNotice: () => void;
  setTransitioning: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setSidebarWidth: (v: number) => void;
  toggleSidebarCollapsed: () => void;
  setShowScrollButton: (groupId: string, v: boolean) => void;
  setChatUnreadCount: (groupId: string, v: number) => void;
  incrementChatUnread: (groupId: string) => void;
  setSmallScreen: (v: boolean) => void;
  setPresentationSplitWidth: (v: number) => void;
  setWorkspaceInspectorOpen: (v: boolean) => void;
  setWorkspaceInspectorWidth: (v: number) => void;
  setWorkspaceInspectorActiveTab: (v: WorkspaceInspectorTab) => void;
  toggleWorkspaceInspector: () => void;
  setChatFilter: (groupId: string, v: ChatFilter) => void;
  setChatSelectedSlotId: (groupId: string, slotId: ChatSlotId) => void;
  setChatScrollSnapshot: (groupId: string, snap: ChatScrollSnapshot | null) => void;
  setChatSlotLastViewedAt: (groupId: string, slotId: ChatSlotId, timestamp: number) => void;
  setChatMobileSurface: (groupId: string, v: "messages" | "presentation") => void;
  setChatPresentationDockOpen: (groupId: string, v: boolean) => void;
  setChatPresentationDisplayMode: (groupId: string, v: "modal" | "split") => void;
  setWebReadOnly: (v: boolean) => void;
  setSSEStatus: (v: "connected" | "connecting" | "disconnected") => void;
  setChatDisplayMode: (groupId: string, mode: "chat" | "terminal") => void;
}

let errorTimeoutId: number | null = null;
let noticeTimeoutId: number | null = null;

// localStorage key for sidebar collapsed state
const SIDEBAR_COLLAPSED_KEY = "cccc-sidebar-collapsed";
const SIDEBAR_WIDTH_KEY = "cccc-sidebar-width";
const PRESENTATION_SPLIT_WIDTH_KEY = "cccc-presentation-split-width";
const WORKSPACE_INSPECTOR_OPEN_KEY = "cccc-workspace-inspector-open";
const WORKSPACE_INSPECTOR_WIDTH_KEY = "cccc-workspace-inspector-width";
const CHAT_SESSIONS_KEY = "cccc-chat-sessions";

export function clampSidebarWidth(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(numeric)));
}

export function clampWorkspaceInspectorWidth(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return WORKSPACE_INSPECTOR_DEFAULT_WIDTH;
  return Math.min(WORKSPACE_INSPECTOR_MAX_WIDTH, Math.max(WORKSPACE_INSPECTOR_MIN_WIDTH, Math.round(numeric)));
}

function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch (e) {
    console.warn("Failed to read sidebar state from localStorage:", e);
    return false;
  }
}

function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch (e) {
    console.warn("Failed to persist sidebar state to localStorage:", e);
  }
}

function loadSidebarWidth(): number {
  try {
    return clampSidebarWidth(Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)));
  } catch (e) {
    console.warn("Failed to read sidebar width from localStorage:", e);
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

function saveSidebarWidth(width: number): void {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(width)));
  } catch (e) {
    console.warn("Failed to persist sidebar width to localStorage:", e);
  }
}

function loadPresentationSplitWidth(): number {
  try {
    return clampPresentationSplitWidth(Number(localStorage.getItem(PRESENTATION_SPLIT_WIDTH_KEY)));
  } catch (e) {
    console.warn("Failed to read presentation split width from localStorage:", e);
    return PRESENTATION_SPLIT_DEFAULT_WIDTH;
  }
}

function savePresentationSplitWidth(width: number): void {
  try {
    localStorage.setItem(PRESENTATION_SPLIT_WIDTH_KEY, String(clampPresentationSplitWidth(width)));
  } catch (e) {
    console.warn("Failed to persist presentation split width to localStorage:", e);
  }
}

function loadWorkspaceInspectorOpen(): boolean {
  try {
    return localStorage.getItem(WORKSPACE_INSPECTOR_OPEN_KEY) === "true";
  } catch (e) {
    console.warn("Failed to read workspace inspector open state from localStorage:", e);
    return false;
  }
}

function saveWorkspaceInspectorOpen(open: boolean): void {
  try {
    localStorage.setItem(WORKSPACE_INSPECTOR_OPEN_KEY, String(open));
  } catch (e) {
    console.warn("Failed to persist workspace inspector open state to localStorage:", e);
  }
}

function loadWorkspaceInspectorWidth(): number {
  try {
    return clampWorkspaceInspectorWidth(Number(localStorage.getItem(WORKSPACE_INSPECTOR_WIDTH_KEY)));
  } catch (e) {
    console.warn("Failed to read workspace inspector width from localStorage:", e);
    return WORKSPACE_INSPECTOR_DEFAULT_WIDTH;
  }
}

function saveWorkspaceInspectorWidth(width: number): void {
  try {
    localStorage.setItem(WORKSPACE_INSPECTOR_WIDTH_KEY, String(clampWorkspaceInspectorWidth(width)));
  } catch (e) {
    console.warn("Failed to persist workspace inspector width to localStorage:", e);
  }
}

function sanitizeChatScrollSnapshot(value: unknown): ChatScrollSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as {
    mode?: unknown;
    anchorId?: unknown;
    offsetPx?: unknown;
    updatedAt?: unknown;
  };
  const mode = snapshot.mode === "detached" ? "detached" : "follow";
  const anchorId = typeof snapshot.anchorId === "string" ? snapshot.anchorId.trim() : "";
  const offsetPx = Number.isFinite(Number(snapshot.offsetPx)) ? Math.max(0, Number(snapshot.offsetPx)) : 0;
  const updatedAt = Number.isFinite(Number(snapshot.updatedAt)) ? Math.max(0, Number(snapshot.updatedAt)) : 0;
  if (mode === "follow") {
    return { mode, anchorId: "", offsetPx: 0, updatedAt };
  }
  if (!anchorId) return null;
  return { mode, anchorId, offsetPx, updatedAt };
}

function sanitizeChatSessions(value: unknown): Record<string, ChatSessionState> {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const next: Record<string, ChatSessionState> = {};
  for (const [groupId, raw] of Object.entries(input)) {
    const gid = String(groupId || "").trim();
    if (!gid || !raw || typeof raw !== "object") continue;
    const session = raw as {
      chatFilter?: unknown;
      selectedSlotId?: unknown;
      slotStates?: unknown;
      scrollSnapshot?: unknown;
      mobileSurface?: unknown;
      presentationDockOpen?: unknown;
      presentationDisplayMode?: unknown;
      chatDisplayMode?: unknown;
      chatDisplayModeExplicit?: unknown;
    };
    const rawDisplayMode = session.chatDisplayMode === "terminal" ? "terminal" : "chat";
    const slotStates = sanitizeChatSlotStates(session.slotStates);
    const legacyScrollSnapshot = sanitizeChatScrollSnapshot(session.scrollSnapshot);
    if (legacyScrollSnapshot) {
      slotStates.all = {
        ...getSessionSlotState({ slotStates }, "all"),
        scrollSnapshot: legacyScrollSnapshot,
      };
    }
    const selectedSlotId = sanitizeChatSlotId(session.selectedSlotId);
    next[gid] = materializeChatSession({
      chatFilter:
        session.chatFilter === "user" ||
        session.chatFilter === "attention" ||
        session.chatFilter === "task"
          ? session.chatFilter
          : "all",
      selectedSlotId,
      slotStates,
      mobileSurface: session.mobileSurface === "presentation" ? "presentation" : "messages",
      presentationDockOpen: Boolean(session.presentationDockOpen),
      presentationDisplayMode: session.presentationDisplayMode === "split" ? "split" : "modal",
      chatDisplayMode: rawDisplayMode,
      chatDisplayModeExplicit:
        typeof session.chatDisplayModeExplicit === "boolean"
          ? session.chatDisplayModeExplicit
          : rawDisplayMode === "terminal",
    });
  }
  return next;
}

function loadChatSessions(): Record<string, ChatSessionState> {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_KEY);
    if (!raw) return {};
    return sanitizeChatSessions(JSON.parse(raw));
  } catch (e) {
    console.warn("Failed to read chat sessions from localStorage:", e);
    return {};
  }
}

function saveChatSessions(sessions: Record<string, ChatSessionState>): void {
  try {
    const persisted = Object.fromEntries(
      Object.entries(sessions).map(([groupId, session]) => [
        groupId,
        {
          chatFilter: session.chatFilter,
          selectedSlotId: session.selectedSlotId,
          slotStates: session.slotStates,
          mobileSurface: session.mobileSurface,
          presentationDockOpen: session.presentationDockOpen,
          presentationDisplayMode: session.presentationDisplayMode,
          chatDisplayMode: session.chatDisplayMode,
          chatDisplayModeExplicit: session.chatDisplayModeExplicit,
        },
      ]),
    );
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(persisted));
  } catch (e) {
    console.warn("Failed to persist chat sessions to localStorage:", e);
  }
}

function updateChatSession(
  sessions: Record<string, ChatSessionState>,
  groupId: string,
  updater: (session: ChatSessionState) => ChatSessionState
): Record<string, ChatSessionState> {
  const gid = String(groupId || "").trim();
  if (!gid) return sessions;
  const current = getChatSession(gid, sessions);
  return {
    ...sessions,
    [gid]: materializeChatSession(updater(current)),
  };
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  activeTab: "chat",
  busy: "",
  errorMsg: "",
  notice: null,
  isTransitioning: false,
  sidebarOpen: true,
  sidebarCollapsed: loadSidebarCollapsed(),
  sidebarWidth: loadSidebarWidth(),
  isSmallScreen: false,
  presentationSplitWidth: loadPresentationSplitWidth(),
  workspaceInspectorOpen: loadWorkspaceInspectorOpen(),
  workspaceInspectorWidth: loadWorkspaceInspectorWidth(),
  workspaceInspectorActiveTab: "files",
  chatSessions: loadChatSessions(),
  webReadOnly: false,
  sseStatus: "disconnected" as const,

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  setBusy: (busy) => set({ busy }),
  setError: (msg) => set({ errorMsg: msg }),

  showError: (msg) => {
    if (errorTimeoutId) window.clearTimeout(errorTimeoutId);
    set({ errorMsg: msg });
    errorTimeoutId = window.setTimeout(() => {
      set({ errorMsg: "" });
      errorTimeoutId = null;
    }, 8000);
  },

  dismissError: () => {
    if (errorTimeoutId) {
      window.clearTimeout(errorTimeoutId);
      errorTimeoutId = null;
    }
    set({ errorMsg: "" });
  },

  showNotice: (notice) => {
    if (noticeTimeoutId) {
      window.clearTimeout(noticeTimeoutId);
      noticeTimeoutId = null;
    }
    set({ notice });
    // Actionable notices remain until user dismisses/clicks action.
    const persistent = Boolean(notice.onAction && notice.actionLabel);
    if (!persistent) {
      noticeTimeoutId = window.setTimeout(() => {
        set({ notice: null });
        noticeTimeoutId = null;
      }, 3500);
    }
  },
  dismissNotice: () => {
    if (noticeTimeoutId) {
      window.clearTimeout(noticeTimeoutId);
      noticeTimeoutId = null;
    }
    set({ notice: null });
  },

  setTransitioning: (v) => set({ isTransitioning: v }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setSidebarCollapsed: (v) => {
    saveSidebarCollapsed(v);
    set({ sidebarCollapsed: v });
  },
  setSidebarWidth: (v) => {
    const next = clampSidebarWidth(v);
    saveSidebarWidth(next);
    set({ sidebarWidth: next });
  },
  toggleSidebarCollapsed: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      saveSidebarCollapsed(next);
      return { sidebarCollapsed: next };
    }),
  setShowScrollButton: (groupId, v) =>
    set((state) => {
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        showScrollButton: v,
      }));
      return { chatSessions };
    }),
  setChatUnreadCount: (groupId, v) =>
    set((state) => ({
      chatSessions: updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        chatUnreadCount: Math.max(0, Number(v || 0)),
      })),
    })),
  incrementChatUnread: (groupId) =>
    set((state) => {
      const current = getChatSession(groupId, state.chatSessions);
      return {
        chatSessions: updateChatSession(state.chatSessions, groupId, (session) => ({
          ...session,
          chatUnreadCount: current.chatUnreadCount + 1,
        })),
      };
    }),
  setSmallScreen: (v) => set({ isSmallScreen: v }),
  setPresentationSplitWidth: (v) => {
    const next = clampPresentationSplitWidth(v);
    savePresentationSplitWidth(next);
    set({ presentationSplitWidth: next });
  },
  setWorkspaceInspectorOpen: (v) => {
    saveWorkspaceInspectorOpen(v);
    set({ workspaceInspectorOpen: v });
  },
  setWorkspaceInspectorWidth: (v) => {
    const next = clampWorkspaceInspectorWidth(v);
    saveWorkspaceInspectorWidth(next);
    set({ workspaceInspectorWidth: next });
  },
  setWorkspaceInspectorActiveTab: (v) => set({ workspaceInspectorActiveTab: v }),
  toggleWorkspaceInspector: () =>
    set((state) => {
      const next = !state.workspaceInspectorOpen;
      saveWorkspaceInspectorOpen(next);
      return { workspaceInspectorOpen: next };
    }),
  setChatFilter: (groupId, v) =>
    set((state) => {
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        chatFilter: v,
      }));
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
  setChatSelectedSlotId: (groupId, slotId) =>
    set((state) => {
      const selectedSlotId = sanitizeChatSlotId(slotId);
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        selectedSlotId,
      }));
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
  setChatScrollSnapshot: (groupId, snap) =>
    set((state) => {
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => {
        const slotId = session.selectedSlotId;
        return {
          ...session,
          slotStates: {
            ...session.slotStates,
            [slotId]: {
              ...getSessionSlotState(session, slotId),
              scrollSnapshot: snap,
            },
          },
        };
      });
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
  setChatSlotLastViewedAt: (groupId, slotId, timestamp) =>
    set((state) => {
      const normalizedSlotId = sanitizeChatSlotId(slotId);
      const lastViewedAt = Number.isFinite(Number(timestamp)) ? Math.max(0, Number(timestamp)) : 0;
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        slotStates: {
          ...session.slotStates,
          [normalizedSlotId]: {
            ...getSessionSlotState(session, normalizedSlotId),
            lastViewedAt,
          },
        },
      }));
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
  setChatMobileSurface: (groupId, v) =>
    set((state) => {
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        mobileSurface: v,
      }));
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
  setChatPresentationDockOpen: (groupId, v) =>
    set((state) => {
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        presentationDockOpen: v,
      }));
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
  setChatPresentationDisplayMode: (groupId, v) =>
    set((state) => {
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        presentationDisplayMode: v,
      }));
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
  setWebReadOnly: (v) => set({ webReadOnly: v }),
  setSSEStatus: (v) => set({ sseStatus: v }),
  setChatDisplayMode: (groupId, mode) =>
    set((state) => {
      const chatSessions = updateChatSession(state.chatSessions, groupId, (session) => ({
        ...session,
        chatDisplayMode: mode,
        chatDisplayModeExplicit: true,
      }));
      saveChatSessions(chatSessions);
      return { chatSessions };
    }),
}));
