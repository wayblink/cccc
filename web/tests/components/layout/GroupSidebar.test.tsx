// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  return { localStorageMock: storage };
});

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
    t: (key: string) => ({
      archiveGroup: "Archive",
      restoreGroup: "Restore",
      deleteGroup: "Delete",
      groupActions: "Group actions",
      workingGroups: "Working Groups",
      archivedGroups: "Archived",
      createNewGroup: "Create new working group",
      newGroup: "+ New",
      openSidebar: "Open sidebar",
      closeSidebar: "Close sidebar",
      collapseSidebar: "Collapse sidebar",
      expandSidebar: "Expand sidebar",
      resizeSidebar: "Resize sidebar",
      closeMenu: "Close menu",
    }[key] || key),
    }),
  };
});

vi.mock("../../../src/stores", async () => {
  const actual = await vi.importActual<typeof import("../../../src/stores")>("../../../src/stores");
  return {
    ...actual,
    useBrandingStore: (selector: (state: { branding: { product_name: string; logo_icon_url: string } }) => unknown) =>
      selector({ branding: { product_name: "CCCC", logo_icon_url: "" } }),
  };
});

import { GroupSidebar } from "../../../src/components/layout/GroupSidebar";

describe("GroupSidebar", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorageMock.getItem.mockReturnValue(null);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as typeof window.matchMedia;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("shows delete only in archived group menus", () => {
    const onDeleteGroup = vi.fn();

    act(() => {
      root?.render(
        <GroupSidebar
          orderedGroups={[
            { group_id: "g-1", title: "Archived", topic: "", state: "idle" },
            { group_id: "g-2", title: "Working", topic: "", state: "active" },
          ]}
          archivedGroupIds={["g-1"]}
          selectedGroupId="g-2"
          activeTab="chat"
          isOpen
          isCollapsed={false}
          sidebarWidth={280}
          isDark={false}
          readOnly
          onSelectGroup={vi.fn()}
          onClose={vi.fn()}
          onToggleCollapse={vi.fn()}
          onResizeWidth={vi.fn()}
          onReorderSection={vi.fn()}
          onArchiveGroup={vi.fn()}
          onRestoreGroup={vi.fn()}
          onDeleteGroup={onDeleteGroup}
        />,
      );
    });

    const archivedToggle = Array.from(container?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Archived"),
    );
    expect(archivedToggle).toBeTruthy();
    act(() => {
      (archivedToggle as HTMLButtonElement).click();
    });

    const menuButtons = Array.from(container?.querySelectorAll('button[aria-label^="Group actions"]') || []);
    expect(menuButtons).toHaveLength(2);
    const archivedMenuButton = menuButtons.find((button) =>
      button.closest(".group\\/item")?.textContent?.includes("Archived"),
    );
    const workingMenuButton = menuButtons.find((button) =>
      button.closest(".group\\/item")?.textContent?.includes("Working"),
    );
    expect(archivedMenuButton).toBeTruthy();
    expect(workingMenuButton).toBeTruthy();

    act(() => {
      (archivedMenuButton as HTMLButtonElement).click();
    });
    expect(document.body.textContent).toContain("Restore");
    expect(document.body.textContent).toContain("Delete");

    act(() => {
      (workingMenuButton as HTMLButtonElement).click();
    });
    const text = document.body.textContent || "";
    expect(text).toContain("Archive");
    expect(text.match(/Delete/g) || []).toHaveLength(1);
  });

  it("uses Solo as the solo group mode tooltip", () => {
    act(() => {
      root?.render(
        <GroupSidebar
          orderedGroups={[
            { group_id: "g-1", title: "Solo group", topic: "", state: "active", mode: "solo" },
          ]}
          archivedGroupIds={[]}
          selectedGroupId="g-1"
          activeTab="chat"
          isOpen
          isCollapsed={false}
          sidebarWidth={280}
          isDark={false}
          readOnly
          onSelectGroup={vi.fn()}
          onClose={vi.fn()}
          onToggleCollapse={vi.fn()}
          onResizeWidth={vi.fn()}
          onReorderSection={vi.fn()}
          onArchiveGroup={vi.fn()}
          onRestoreGroup={vi.fn()}
          onDeleteGroup={vi.fn()}
        />,
      );
    });

    expect(container?.querySelector('[title="Solo"]')).toBeTruthy();
    expect(container?.querySelector('[title="Interactive"]')).toBeNull();
  });
});
