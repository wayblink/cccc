export type WorkspaceInspectorTab = "files" | "preview" | "diff";

export type WorkspaceTreeItem = {
  name: string;
  path: string;
  is_dir: boolean;
  mime_type?: string;
  size?: number;
  git_status?: string;
};

export type WorkspaceTreeListing = {
  root_path: string;
  path: string;
  parent: string | null;
  items: WorkspaceTreeItem[];
};

export type WorkspaceFilePreview = {
  root_path: string;
  path: string;
  name: string;
  mime_type: string;
  size: number;
  is_binary: boolean;
  truncated: boolean;
  content: string;
};

export type WorkspaceGitStatusItem = {
  path: string;
  index: string;
  worktree: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked" | "conflicted" | string;
  old_path?: string;
};

export type WorkspaceGitStatus = {
  is_git_repo: boolean;
  root_path: string;
  repo_root_path?: string;
  items: WorkspaceGitStatusItem[];
};

export type WorkspaceGitDiff = {
  is_git_repo: boolean;
  root_path?: string;
  repo_root_path?: string;
  path: string;
  diff: string;
  truncated: boolean;
};
