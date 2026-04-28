export function normalizeWorkspacePath(value: string): string {
  const raw = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const parts: string[] = [];
  for (const part of raw.split("/")) {
    const piece = part.trim();
    if (!piece || piece === ".") continue;
    if (piece === "..") {
      if (parts.length === 0) return "";
      parts.pop();
      continue;
    }
    parts.push(piece);
  }
  return parts.join("/");
}

export function dirname(path: string): string {
  const normalized = normalizeWorkspacePath(path);
  const index = normalized.lastIndexOf("/");
  return index <= 0 ? "" : normalized.slice(0, index);
}

export function basename(path: string): string {
  const normalized = normalizeWorkspacePath(path);
  const index = normalized.lastIndexOf("/");
  return index < 0 ? normalized : normalized.slice(index + 1);
}
