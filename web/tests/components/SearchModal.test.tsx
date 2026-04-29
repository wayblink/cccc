// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Actor, LedgerEvent } from "../../src/types";

const apiJson = vi.fn();

vi.mock("../../src/services/api", () => ({
  apiJson: (...args: unknown[]) => apiJson(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      searchMessages: "Search Messages",
      closeSearchModal: "Close search modal",
      query: "Query",
      searchPlaceholder: "Search text",
      "common:search": "Search",
      kind: "Kind",
      kindAll: "All",
      kindChat: "Chat",
      kindNotify: "Notify",
      by: "By",
      any: "Any",
      loadOlderResults: "Load older results",
      reply: "Reply",
      replyTo: "↩ Reply",
      openMessage: "↗ Open",
      openMessageContext: "Open message context",
      copyEventId: "Copy event id",
      copyId: "⧉ Copy ID",
      noResults: "No results",
      noResultsHint: "Try another query",
      "common:copied": "Copied",
      "common:copyFailed": "Copy failed",
    }[key] || key),
  }),
}));

vi.mock("../../src/hooks/useModalA11y", () => ({
  useModalA11y: () => ({ modalRef: { current: null } }),
}));

vi.mock("../../src/hooks/useCopyFeedback", () => ({
  useCopyFeedback: () => vi.fn(),
}));

import { SearchModal } from "../../src/components/SearchModal";

function defaultProps() {
  return {
    isOpen: true,
    onClose: vi.fn(),
    groupId: "group-1",
    actors: [{ id: "agent-1", title: "Agent One" }] as Actor[],
    isDark: false,
    onReply: vi.fn(),
    onJumpToMessage: vi.fn(),
  };
}

function renderSearchModal(overrides: Partial<React.ComponentProps<typeof SearchModal>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<SearchModal {...defaultProps()} {...overrides} />);
  });

  return { container, root };
}

describe("SearchModal visual polish", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    apiJson.mockReset();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("uses SVG search chrome and blue project primary styling for the primary search action", () => {
    ({ container, root } = renderSearchModal());

    const searchButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Search"
    ) as HTMLButtonElement | undefined;

    expect(searchButton).toBeTruthy();
    expect(searchButton?.className).toContain("bg-blue-600");
    expect(searchButton?.className).toContain("hover:bg-blue-500");
    expect(searchButton?.className).toContain("text-white");
    expect(searchButton?.className).not.toContain("glass-btn-accent");
    expect(searchButton?.className).not.toContain("bg-emerald-600");
    expect(searchButton?.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("#search-modal-title svg")).toBeTruthy();
    expect(container.querySelector('[aria-label="Close search modal"] svg')).toBeTruthy();
    expect(container.textContent).not.toContain("🔍");
    expect(container.textContent).not.toContain("🔎");
  });

  it("renders result actions with SVG icons instead of leading glyph characters", async () => {
    const event: LedgerEvent = {
      id: "evt-1",
      ts: "2026-04-29T01:02:03Z",
      kind: "chat.message",
      by: "agent-1",
      data: { text: "Needle in the haystack" },
    };
    apiJson.mockResolvedValue({
      ok: true,
      result: { events: [event], has_more: false, count: 1 },
    });
    ({ container, root } = renderSearchModal());

    await act(async () => {
      const input = container?.querySelector("input") as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, "Needle");
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));

      const searchButton = Array.from(container?.querySelectorAll("button") || []).find(
        (button) => button.textContent === "Search"
      ) as HTMLButtonElement;
      searchButton.click();
    });

    const replyButton = Array.from(container?.querySelectorAll("button") || []).find(
      (button) => button.textContent?.trim() === "Reply"
    );
    const openButton = Array.from(container?.querySelectorAll("button") || []).find(
      (button) => button.textContent?.trim() === "Open"
    );
    const copyButton = Array.from(container?.querySelectorAll("button") || []).find(
      (button) => button.textContent?.trim() === "Copy ID"
    );

    expect(replyButton?.querySelector("svg")).toBeTruthy();
    expect(openButton?.querySelector("svg")).toBeTruthy();
    expect(copyButton?.querySelector("svg")).toBeTruthy();
    expect(container?.textContent).not.toContain("↩");
    expect(container?.textContent).not.toContain("↗");
    expect(container?.textContent).not.toContain("⧉");
  });
});
