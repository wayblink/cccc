import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const WEB_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const CHAT_TYPOGRAPHY_FILES = [
  "src/components/MessageBubble.tsx",
  "src/components/VirtualMessageList.tsx",
  "src/components/messageBubble/MessageBubbleChrome.tsx",
  "src/components/messageBubble/StreamingMessageBody.tsx",
  "src/pages/chat/ChatComposer.tsx",
  "src/pages/chat/ChatTab.tsx",
  "src/pages/chat/RuntimeDock.tsx",
  "src/pages/chat/SetupChecklist.tsx",
];
const PIXEL_TEXT_CLASS_PATTERN = /text-\[(?:9|10|11)px\]/g;

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, `file://${WEB_ROOT}/`), "utf8");
}

describe("chat typography scale", () => {
  it("keeps the primary bubble body on a larger rem-based size", () => {
    const source = readSource("src/components/MessageBubble.tsx");

    expect(source).toContain("inline-flex max-w-full flex-col px-4 py-2.5 text-base leading-relaxed");
  });

  it("avoids fixed px font sizes across chat surfaces so global text scale can work", () => {
    const offenders = CHAT_TYPOGRAPHY_FILES.flatMap((relativePath) => {
      const source = readSource(relativePath);
      return Array.from(source.matchAll(PIXEL_TEXT_CLASS_PATTERN), (match) => `${relativePath}:${match[0]}`);
    });

    expect(offenders).toEqual([]);
  });
});
