import { describe, expect, it } from "vitest";

import {
  buildScriptPayload,
  chooseSelectedScriptId,
  createEmptyScriptDraft,
  draftFromScript,
  formatScriptEnvText,
  normalizeScriptKind,
  parseScriptEnvText,
  shouldPollScript,
  upsertScriptDefinition,
} from "../../../src/pages/scripts/model";
import type { ScriptDefinition } from "../../../src/types";

const alphaScript: ScriptDefinition = {
  id: "script-alpha",
  name: "Alpha",
  kind: "service",
  command: "npm run dev",
  cwd: "/tmp/alpha",
  env: { PORT: "3000" },
};

const betaScript: ScriptDefinition = {
  id: "script-beta",
  name: "Beta",
  kind: "task",
  command: "npm run build",
  cwd: "/tmp/beta",
  env: {},
};

describe("script manager model helpers", () => {
  it("parses KEY=VALUE lines into env records", () => {
    expect(
      parseScriptEnvText(`
FOO=bar
EMPTY=
WITH_EQUALS=hello=world
INVALID_LINE
`)
    ).toEqual({
      FOO: "bar",
      EMPTY: "",
      WITH_EQUALS: "hello=world",
    });
  });

  it("formats env records into stable text", () => {
    expect(
      formatScriptEnvText({
        NODE_ENV: "development",
        PORT: "3000",
      })
    ).toBe("NODE_ENV=development\nPORT=3000");
  });

  it("normalizes unsupported kinds to service", () => {
    expect(normalizeScriptKind("task")).toBe("task");
    expect(normalizeScriptKind("whatever")).toBe("service");
  });

  it("only polls while the script is running", () => {
    expect(shouldPollScript("running")).toBe(true);
    expect(shouldPollScript("idle")).toBe(false);
    expect(shouldPollScript("failed")).toBe(false);
  });

  it("builds script payloads from drafts", () => {
    expect(
      buildScriptPayload({
        ...createEmptyScriptDraft(),
        name: " Dev Server ",
        kind: "task",
        command: " npm run dev ",
        cwd: " . ",
        envText: "PORT=3000\nNODE_ENV=development\nINVALID",
      })
    ).toEqual({
      name: "Dev Server",
      kind: "task",
      command: "npm run dev",
      cwd: ".",
      env: {
        PORT: "3000",
        NODE_ENV: "development",
      },
    });
  });

  it("hydrates drafts from saved scripts", () => {
    expect(draftFromScript(alphaScript)).toEqual({
      name: "Alpha",
      kind: "service",
      command: "npm run dev",
      cwd: "/tmp/alpha",
      envText: "PORT=3000",
    });
  });

  it("keeps existing order when updating and prepends new scripts", () => {
    expect(
      upsertScriptDefinition([alphaScript, betaScript], {
        ...betaScript,
        name: "Beta Updated",
      })
    ).toEqual([
      alphaScript,
      {
        ...betaScript,
        name: "Beta Updated",
      },
    ]);

    expect(upsertScriptDefinition([alphaScript], betaScript)).toEqual([betaScript, alphaScript]);
  });

  it("prefers the requested script id and falls back to the first script", () => {
    expect(chooseSelectedScriptId([alphaScript, betaScript], "script-beta")).toBe("script-beta");
    expect(chooseSelectedScriptId([alphaScript, betaScript], "missing")).toBe("script-alpha");
    expect(chooseSelectedScriptId([], "missing")).toBeNull();
  });
});
