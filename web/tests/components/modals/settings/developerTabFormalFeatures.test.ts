import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../../..");

function readSource(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("Developer settings formal features", () => {
  it("does not expose Terminal Direct Mode as a developer experiment", () => {
    const developerTab = readSource("src/components/modals/settings/DeveloperTab.tsx");

    expect(developerTab).not.toContain("Terminal Direct Mode");
    expect(developerTab).not.toContain("experimental");
    expect(developerTab).not.toContain("terminalDirectMode");
  });
});
