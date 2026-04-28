import type { ApiResponse } from "../../services/api/base";
import { apiJson, asOptionalString, asRecord, asString } from "../../services/api/base";
import type {
  WorkspaceFilePreview,
  WorkspaceGitDiff,
  WorkspaceGitStatus,
  WorkspaceGitStatusItem,
  WorkspaceTreeItem,
  WorkspaceTreeListing,
} from "./workspaceTypes";
import { normalizeWorkspacePath } from "./pathUtils";

function workspacePathQuery(path: string): string {
  const params = new URLSearchParams();
  const normalized = normalizeWorkspacePath(path);
  if (normalized) params.set("path", normalized);
  return params.toString() ? `?${params.toString()}` : "";
}

function normalizeTreeItem(value: unknown): WorkspaceTreeItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = asString(record.name).trim();
  const path = normalizeWorkspacePath(asString(record.path));
  if (!name && !path) return null;
  return {
    name: name || path.split("/").pop() || "",
    path,
    is_dir: !!record.is_dir,
    mime_type: asOptionalString(record.mime_type) || "",
    size: Number.isFinite(Number(record.size)) ? Number(record.size) : 0,
    git_status: asOptionalString(record.git_status) || undefined,
  };
}

export async function fetchWorkspaceTree(groupId: string, path = ""): Promise<ApiResponse<WorkspaceTreeListing>> {
  const suffix = workspacePathQuery(path);
  const resp = await apiJson<{
    root_path?: unknown;
    path?: unknown;
    parent?: unknown;
    items?: unknown;
  }>(`/api/v1/groups/${encodeURIComponent(groupId)}/workspace/tree${suffix}`);
  if (!resp.ok) return resp as ApiResponse<WorkspaceTreeListing>;
  const items = Array.isArray(resp.result.items)
    ? resp.result.items.map((item) => normalizeTreeItem(item)).filter((item): item is WorkspaceTreeItem => !!item)
    : [];
  return {
    ok: true,
    result: {
      root_path: asString(resp.result.root_path).trim(),
      path: normalizeWorkspacePath(asString(resp.result.path)),
      parent:
        typeof resp.result.parent === "string"
          ? normalizeWorkspacePath(resp.result.parent)
          : resp.result.parent == null
            ? null
            : normalizeWorkspacePath(String(resp.result.parent)),
      items,
    },
  };
}

export async function fetchWorkspaceFile(groupId: string, path: string): Promise<ApiResponse<WorkspaceFilePreview>> {
  const suffix = workspacePathQuery(path);
  const resp = await apiJson<WorkspaceFilePreview>(`/api/v1/groups/${encodeURIComponent(groupId)}/workspace/file${suffix}`);
  if (!resp.ok) return resp as ApiResponse<WorkspaceFilePreview>;
  return {
    ok: true,
    result: {
      root_path: asString(resp.result.root_path).trim(),
      path: normalizeWorkspacePath(asString(resp.result.path)),
      name: asString(resp.result.name).trim(),
      mime_type: asString(resp.result.mime_type).trim(),
      size: Number.isFinite(Number(resp.result.size)) ? Number(resp.result.size) : 0,
      is_binary: !!resp.result.is_binary,
      truncated: !!resp.result.truncated,
      content: asString(resp.result.content),
    },
  };
}

function normalizeGitStatusItem(value: unknown): WorkspaceGitStatusItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const path = normalizeWorkspacePath(asString(record.path));
  if (!path) return null;
  return {
    path,
    index: asString(record.index).slice(0, 1) || " ",
    worktree: asString(record.worktree).slice(0, 1) || " ",
    status: asString(record.status).trim() || "changed",
    old_path: asOptionalString(record.old_path) || undefined,
  };
}

export async function fetchWorkspaceGitStatus(groupId: string): Promise<ApiResponse<WorkspaceGitStatus>> {
  const resp = await apiJson<{
    is_git_repo?: unknown;
    root_path?: unknown;
    repo_root_path?: unknown;
    items?: unknown;
  }>(`/api/v1/groups/${encodeURIComponent(groupId)}/workspace/git/status`);
  if (!resp.ok) return resp as ApiResponse<WorkspaceGitStatus>;
  const items = Array.isArray(resp.result.items)
    ? resp.result.items.map((item) => normalizeGitStatusItem(item)).filter((item): item is WorkspaceGitStatusItem => !!item)
    : [];
  return {
    ok: true,
    result: {
      is_git_repo: !!resp.result.is_git_repo,
      root_path: asString(resp.result.root_path).trim(),
      repo_root_path: asOptionalString(resp.result.repo_root_path) || undefined,
      items,
    },
  };
}

export async function fetchWorkspaceGitDiff(groupId: string, path = ""): Promise<ApiResponse<WorkspaceGitDiff>> {
  const suffix = workspacePathQuery(path);
  const resp = await apiJson<WorkspaceGitDiff>(`/api/v1/groups/${encodeURIComponent(groupId)}/workspace/git/diff${suffix}`);
  if (!resp.ok) return resp as ApiResponse<WorkspaceGitDiff>;
  return {
    ok: true,
    result: {
      is_git_repo: !!resp.result.is_git_repo,
      root_path: asOptionalString(resp.result.root_path) || undefined,
      repo_root_path: asOptionalString(resp.result.repo_root_path) || undefined,
      path: normalizeWorkspacePath(asString(resp.result.path)),
      diff: asString(resp.result.diff),
      truncated: !!resp.result.truncated,
    },
  };
}
