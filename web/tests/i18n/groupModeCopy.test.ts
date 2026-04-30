import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "../../..");

type Locale = "en" | "ja" | "zh";
type Namespace = "layout" | "modals" | "settings";

function readLocale(locale: Locale, namespace: Namespace): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(repoRoot, `web/src/i18n/locales/${locale}/${namespace}.json`), "utf8"),
  ) as Record<string, unknown>;
}

function lookup(tree: Record<string, unknown>, dottedKey: string): unknown {
  let node: unknown = tree;
  for (const part of dottedKey.split(".")) {
    if (!node || typeof node !== "object" || !(part in node)) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

describe("group mode copy", () => {
  it("labels solo-mode groups as Solo in user-facing locales", () => {
    const expected = {
      en: { option: "Solo", mode: "Solo mode" },
      ja: { option: "ソロ", mode: "ソロモード" },
      zh: { option: "独立模式", mode: "独立模式" },
    } satisfies Record<Locale, { option: string; mode: string }>;

    for (const locale of Object.keys(expected) as Locale[]) {
      const modals = readLocale(locale, "modals");
      const layout = readLocale(locale, "layout");
      const settings = readLocale(locale, "settings");

      expect(lookup(modals, "createGroup.interactiveMode")).toBe(expected[locale].option);
      expect(lookup(layout, "groupModeInteractive")).toBe(expected[locale].mode);
      expect(lookup(settings, "messaging.modeInteractive")).toBe(expected[locale].mode);
    }
  });

  it("keeps solo-mode explanatory copy away from legacy Interactive/Direct labels", () => {
    const copyKeys: Array<[Namespace, string]> = [
      ["layout", "noGroupsDescription"],
      ["modals", "createGroup.interactiveModeHint"],
      ["modals", "context.notifyAgentsUnsupported"],
      ["settings", "automation.interactiveRecipientHint"],
      ["settings", "messaging.modeInteractiveHint"],
      ["settings", "messaging.interactiveHint"],
    ];

    const legacyLabelPattern = /Interactive|interactive mode|Direct mode|Direct groups|Direct sessions|インタラクティブ|ダイレクトモード|対話モード|交互模式|直连模式/;

    for (const locale of ["en", "ja", "zh"] as Locale[]) {
      for (const [namespace, key] of copyKeys) {
        const value = String(lookup(readLocale(locale, namespace), key) || "");
        expect(value, `${locale}.${namespace}.${key}`).not.toMatch(legacyLabelPattern);
      }
    }
  });
});
