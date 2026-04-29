export type DiffLine = {
  kind: "file" | "hunk" | "add" | "remove" | "context";
  text: string;
};

export function parseUnifiedDiffLines(diff: string): DiffLine[] {
  return String(diff || "")
    .split(/\r?\n/)
    .filter((line, index, lines) => index < lines.length - 1 || line.length > 0)
    .map((line) => {
      if (line.startsWith("diff --git ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
        return { kind: "file", text: line };
      }
      if (line.startsWith("@@")) return { kind: "hunk", text: line };
      if (line.startsWith("+")) return { kind: "add", text: line };
      if (line.startsWith("-")) return { kind: "remove", text: line };
      return { kind: "context", text: line };
    });
}
