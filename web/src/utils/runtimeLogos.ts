import type { SupportedRuntime } from "../types";

type RuntimeLogoRuntime = Exclude<SupportedRuntime, "custom">;

export const UI_KIND_LOGO_FILE_BY_UI_KIND = {
  quick_terminal: "logos/terminal.png",
} as const;

export const RUNTIME_LOGO_FILE_BY_RUNTIME: Record<RuntimeLogoRuntime, string> = {
  amp: "logos/amp.png",
  auggie: "logos/auggie.png",
  claude: "logos/claude.png",
  codex: "logos/codex.png",
  droid: "logos/droid.png",
  gemini: "logos/gemini.png",
  copilot: "logos/copilot.png",
  kimi: "logos/kimi.png",
  neovate: "logos/neovate.png",
};

export function getRuntimeLogoSrc(runtime: string | null | undefined): string | null {
  const normalizedRuntime = String(runtime || "").trim().toLowerCase() as RuntimeLogoRuntime;
  const relativePath = RUNTIME_LOGO_FILE_BY_RUNTIME[normalizedRuntime];
  return relativePath ? `${import.meta.env.BASE_URL}${relativePath}` : null;
}

export function getUiKindLogoSrc(uiKind: string | null | undefined): string | null {
  const normalizedUiKind = String(uiKind || "").trim().toLowerCase() as keyof typeof UI_KIND_LOGO_FILE_BY_UI_KIND;
  const relativePath = UI_KIND_LOGO_FILE_BY_UI_KIND[normalizedUiKind];
  return relativePath ? `${import.meta.env.BASE_URL}${relativePath}` : null;
}

export function getActorLogoSrc(args: {
  runtime?: string | null;
  uiKind?: string | null;
}): string | null {
  return getUiKindLogoSrc(args.uiKind) || getRuntimeLogoSrc(args.runtime);
}
