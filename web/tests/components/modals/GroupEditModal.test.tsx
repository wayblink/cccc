// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "groupEdit.title": "Edit group",
      "groupEdit.nameLabel": "Name",
      "groupEdit.descriptionLabel": "Description",
      "groupEdit.groupNamePlaceholder": "Group name",
      "groupEdit.descriptionPlaceholder": "Description",
      "groupEdit.groupId": "Group ID",
      "groupEdit.projectRoot": "Project root",
      "groupEdit.noScopeAttached": "-",
      "groupEdit.groupDataDirectory": "Group data directory",
      "groupEdit.groupConfigFile": "Group config file",
      "groupEdit.groupLedgerFile": "Group ledger file",
      "groupEdit.copyGroupId": "Copy group ID",
      "groupEdit.copyProjectRoot": "Copy project root",
      "groupEdit.copyDataDir": "Copy data dir",
      "groupEdit.copyConfigFile": "Copy config file",
      "groupEdit.copyLedgerFile": "Copy ledger file",
      "groupEdit.deleteTitle": "Delete this group permanently",
      "common:save": "Save",
      "common:cancel": "Cancel",
      "common:copy": "Copy",
      "common:delete": "Delete",
    }[key] || key),
  }),
}));

import { GroupEditModal } from "../../../src/components/modals/GroupEditModal";

describe("GroupEditModal", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.unstubAllGlobals();
  });

  it("only shows delete when the group can be hard deleted", () => {
    const props = {
      isOpen: true,
      busy: "",
      groupId: "g-1",
      ccccHome: "/tmp/cccc",
      projectRoot: "/tmp/project",
      title: "Archived",
      topic: "",
      onChangeTitle: vi.fn(),
      onChangeTopic: vi.fn(),
      onSave: vi.fn(),
      onCancel: vi.fn(),
      onDelete: vi.fn(),
      deleteConfirmMessage: "Delete it?",
    };

    act(() => {
      root?.render(<GroupEditModal {...props} canDelete={false} />);
    });
    expect(container?.textContent).not.toContain("Delete");

    act(() => {
      root?.render(<GroupEditModal {...props} canDelete />);
    });
    expect(container?.textContent).toContain("Delete");
  });

  it("confirms before calling onDelete", () => {
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);

    act(() => {
      root?.render(
        <GroupEditModal
          isOpen
          busy=""
          groupId="g-1"
          ccccHome="/tmp/cccc"
          projectRoot="/tmp/project"
          title="Archived"
          topic=""
          onChangeTitle={vi.fn()}
          onChangeTopic={vi.fn()}
          onSave={vi.fn()}
          onCancel={onCancel}
          onDelete={onDelete}
          canDelete
          deleteConfirmMessage="Delete archived group?"
        />,
      );
    });

    const buttons = Array.from(container?.querySelectorAll("button") || []);
    const deleteButton = buttons.find((button) => button.textContent?.includes("Delete"));
    expect(deleteButton).toBeTruthy();

    act(() => {
      (deleteButton as HTMLButtonElement).click();
    });

    expect(confirm).toHaveBeenCalledWith("Delete archived group?");
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
