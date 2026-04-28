import { create } from "zustand";
import {
  fetchWorkspaceFile,
  fetchWorkspaceGitDiff,
  fetchWorkspaceGitStatus,
  fetchWorkspaceTree,
} from "./workspaceApi";
import { normalizeWorkspacePath } from "./pathUtils";
import type {
  WorkspaceFilePreview,
  WorkspaceGitDiff,
  WorkspaceGitStatus,
  WorkspaceGitStatusItem,
  WorkspaceTreeListing,
} from "./workspaceTypes";

export type WorkspaceInspectorState = {
  currentGroupId: string;
  expandedDirs: Record<string, boolean>;
  selectedPath: string;
  selectedFile: WorkspaceFilePreview | null;
  treeByDir: Record<string, WorkspaceTreeListing>;
  loadingDirs: Record<string, boolean>;
  gitStatus: WorkspaceGitStatus | null;
  statusByPath: Record<string, WorkspaceGitStatusItem>;
  selectedDiff: WorkspaceGitDiff | null;
  loadingFile: boolean;
  loadingStatus: boolean;
  loadingDiff: boolean;
  error: string;
  resetForGroup: (groupId: string) => void;
  loadDir: (groupId: string, path?: string) => Promise<void>;
  toggleDir: (groupId: string, path: string) => Promise<void>;
  selectFile: (groupId: string, path: string) => Promise<void>;
  loadGitStatus: (groupId: string) => Promise<void>;
  loadDiff: (groupId: string, path?: string) => Promise<void>;
  refresh: (groupId: string) => Promise<void>;
};

function emptyGroupState(groupId: string): Pick<
  WorkspaceInspectorState,
  | "currentGroupId"
  | "expandedDirs"
  | "selectedPath"
  | "selectedFile"
  | "treeByDir"
  | "loadingDirs"
  | "gitStatus"
  | "statusByPath"
  | "selectedDiff"
  | "loadingFile"
  | "loadingStatus"
  | "loadingDiff"
  | "error"
> {
  return {
    currentGroupId: groupId,
    expandedDirs: { "": true },
    selectedPath: "",
    selectedFile: null,
    treeByDir: {},
    loadingDirs: {},
    gitStatus: null,
    statusByPath: {},
    selectedDiff: null,
    loadingFile: false,
    loadingStatus: false,
    loadingDiff: false,
    error: "",
  };
}

function apiErrorMessage(response: { error?: { message?: string } }): string {
  return response.error?.message || "Workspace request failed";
}

function statusMap(items: WorkspaceGitStatusItem[]): Record<string, WorkspaceGitStatusItem> {
  return Object.fromEntries(items.map((item) => [normalizeWorkspacePath(item.path), item]));
}

function ensureCurrentGroup(
  set: (partial: Partial<WorkspaceInspectorState>) => void,
  get: () => WorkspaceInspectorState,
  groupId: string,
): string {
  const gid = String(groupId || "").trim();
  if (get().currentGroupId !== gid) {
    set(emptyGroupState(gid));
  }
  return gid;
}

export const useWorkspaceInspectorStore = create<WorkspaceInspectorState>((set, get) => ({
  ...emptyGroupState(""),

  resetForGroup: (groupId) => {
    set(emptyGroupState(String(groupId || "").trim()));
  },

  loadDir: async (groupId, path = "") => {
    const gid = ensureCurrentGroup(set, get, groupId);
    if (!gid) return;
    const normalizedPath = normalizeWorkspacePath(path);
    set((state) => ({
      error: "",
      loadingDirs: { ...state.loadingDirs, [normalizedPath]: true },
    }));
    const response = await fetchWorkspaceTree(gid, normalizedPath);
    if (get().currentGroupId !== gid) return;
    if (response.ok) {
      set((state) => ({
        treeByDir: { ...state.treeByDir, [normalizedPath]: response.result },
        loadingDirs: { ...state.loadingDirs, [normalizedPath]: false },
      }));
      return;
    }
    set((state) => ({
      error: apiErrorMessage(response),
      loadingDirs: { ...state.loadingDirs, [normalizedPath]: false },
    }));
  },

  toggleDir: async (groupId, path) => {
    const gid = ensureCurrentGroup(set, get, groupId);
    if (!gid) return;
    const normalizedPath = normalizeWorkspacePath(path);
    const currentlyExpanded = !!get().expandedDirs[normalizedPath];
    set((state) => ({
      expandedDirs: { ...state.expandedDirs, [normalizedPath]: !currentlyExpanded },
    }));
    if (!currentlyExpanded && !get().treeByDir[normalizedPath]) {
      await get().loadDir(gid, normalizedPath);
    }
  },

  selectFile: async (groupId, path) => {
    const gid = ensureCurrentGroup(set, get, groupId);
    if (!gid) return;
    const normalizedPath = normalizeWorkspacePath(path);
    set({
      error: "",
      loadingFile: true,
      selectedPath: normalizedPath,
      selectedFile: null,
      selectedDiff: null,
    });
    const response = await fetchWorkspaceFile(gid, normalizedPath);
    if (get().currentGroupId !== gid || get().selectedPath !== normalizedPath) return;
    if (response.ok) {
      set({ selectedFile: response.result, loadingFile: false });
      return;
    }
    set({ error: apiErrorMessage(response), loadingFile: false });
  },

  loadGitStatus: async (groupId) => {
    const gid = ensureCurrentGroup(set, get, groupId);
    if (!gid) return;
    set({ error: "", loadingStatus: true });
    const response = await fetchWorkspaceGitStatus(gid);
    if (get().currentGroupId !== gid) return;
    if (response.ok) {
      set({
        gitStatus: response.result,
        statusByPath: statusMap(response.result.items),
        loadingStatus: false,
      });
      return;
    }
    set({ error: apiErrorMessage(response), loadingStatus: false });
  },

  loadDiff: async (groupId, path = "") => {
    const gid = ensureCurrentGroup(set, get, groupId);
    if (!gid) return;
    const normalizedPath = normalizeWorkspacePath(path || get().selectedPath);
    set({
      error: "",
      loadingDiff: true,
      ...(normalizedPath ? { selectedPath: normalizedPath } : {}),
    });
    const response = await fetchWorkspaceGitDiff(gid, normalizedPath);
    if (get().currentGroupId !== gid) return;
    if (response.ok) {
      set({ selectedDiff: response.result, loadingDiff: false });
      return;
    }
    set({ error: apiErrorMessage(response), loadingDiff: false });
  },

  refresh: async (groupId) => {
    const gid = ensureCurrentGroup(set, get, groupId);
    if (!gid) return;
    const selectedPath = get().selectedPath;
    await Promise.all([get().loadDir(gid, ""), get().loadGitStatus(gid)]);
    if (selectedPath) {
      await Promise.all([get().selectFile(gid, selectedPath), get().loadDiff(gid, selectedPath)]);
    }
  },
}));
