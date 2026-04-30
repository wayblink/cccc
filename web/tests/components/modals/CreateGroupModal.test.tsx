// @vitest-environment jsdom
import React, { useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "createGroup.title": "Create group",
      "createGroup.subtitle": "Spin up a new working group",
      "createGroup.quickSelect": "Quick select",
      "createGroup.projectDirectory": "Project directory",
      "createGroup.pathPlaceholder": "Path to new project directory",
      "createGroup.pathAutoCreateHint": "Directory will be created if needed",
      "createGroup.browse": "Browse",
      "createGroup.newFolder": "New folder",
      "createGroup.newFolderNamePlaceholder": "Folder name",
      "createGroup.createFolder": "Create folder",
      "createGroup.creatingFolder": "Creating folder...",
      "createGroup.folderNameRequired": "Folder name is required",
      "createGroup.groupName": "Group name",
      "createGroup.groupNamePlaceholder": "Working group name",
      "createGroup.modeLabel": "Group mode",
      "createGroup.soloMode": "Solo",
      "createGroup.soloModeHint": "Solo sessions without collaboration routing",
      "createGroup.collaborationMode": "Collaboration",
      "createGroup.collaborationModeHint": "Original multi-agent collaboration semantics",
      "createGroup.blueprintLabel": "Blueprint",
      "createGroup.blueprintHint": "Optional template",
      "createGroup.selectBlueprintFile": "Select blueprint file",
      "createGroup.noBlueprintFile": "No blueprint selected",
      "createGroup.directoryBrowserTitle": "Choose project directory",
      "createGroup.useCurrentDirectory": "Use this directory",
      "createGroup.createGroup": "Create group",
      "createGroup.createFromBlueprint": "Create from blueprint",
      "createGroup.creating": "Creating...",
      "common:cancel": "Cancel",
      "common:reset": "Reset",
    }[key] || key),
  }),
}));

vi.mock("../../../src/hooks/useModalA11y", () => ({
  useModalA11y: () => ({ modalRef: { current: null } }),
}));

import { CreateGroupModal } from "../../../src/components/modals/CreateGroupModal";

function Harness() {
  const [createGroupPath, setCreateGroupPath] = useState("");
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupMode, setCreateGroupMode] = useState<"solo" | "collaboration">("solo");

  return (
    <CreateGroupModal
      isOpen
      busy=""
      dirItems={[]}
      currentDir=""
      parentDir={null}
      showDirBrowser={false}
      createGroupPath={createGroupPath}
      setCreateGroupPath={setCreateGroupPath}
      createGroupName={createGroupName}
      setCreateGroupName={setCreateGroupName}
      createGroupMode={createGroupMode}
      setCreateGroupMode={setCreateGroupMode}
      createGroupTemplateFile={null}
      templatePreview={null}
      templateError=""
      templateBusy={false}
      onSelectTemplate={() => {}}
      onFetchDirContents={() => {}}
      onCreateDirectory={async () => ({ ok: true, path: "" })}
      onCloseDirBrowser={() => {}}
      onCreateGroup={() => {}}
      onClose={() => {}}
      onCancelAndReset={() => {}}
    />
  );
}

function BrowserHarness() {
  const [createGroupPath, setCreateGroupPath] = useState("/tmp");
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupMode, setCreateGroupMode] = useState<"solo" | "collaboration">("solo");
  const [currentDir, setCurrentDir] = useState("/tmp");
  const [parentDir, setParentDir] = useState("/");
  const [dirItems, setDirItems] = useState([{ name: "existing", path: "/tmp/existing", is_dir: true }]);

  return (
    <CreateGroupModal
      isOpen
      busy=""
      dirItems={dirItems}
      currentDir={currentDir}
      parentDir={parentDir}
      showDirBrowser
      createGroupPath={createGroupPath}
      setCreateGroupPath={setCreateGroupPath}
      createGroupName={createGroupName}
      setCreateGroupName={setCreateGroupName}
      createGroupMode={createGroupMode}
      setCreateGroupMode={setCreateGroupMode}
      createGroupTemplateFile={null}
      templatePreview={null}
      templateError=""
      templateBusy={false}
      onSelectTemplate={() => {}}
      onFetchDirContents={(path) => {
        setCurrentDir(path);
        setParentDir(path === "/" ? null : "/");
      }}
      onCreateDirectory={async (_parentPath, name) => {
        const createdPath = `/tmp/${name}`;
        setCurrentDir(createdPath);
        setParentDir("/tmp");
        setDirItems([]);
        return { ok: true, path: createdPath };
      }}
      onCloseDirBrowser={() => {}}
      onCreateGroup={() => {}}
      onClose={() => {}}
      onCancelAndReset={() => {}}
    />
  );
}

describe("CreateGroupModal", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<Harness />);
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  function getInputs() {
    const textInputs = Array.from(container?.querySelectorAll('input:not([type="file"])') || []);
    expect(textInputs).toHaveLength(2);
    return {
      pathInput: textInputs[0] as HTMLInputElement,
      nameInput: textInputs[1] as HTMLInputElement,
    };
  }

  function getModeButtons() {
    const buttons = Array.from(container?.querySelectorAll('button[aria-pressed]') || []);
    expect(buttons).toHaveLength(2);
    return {
      soloButton: buttons[0] as HTMLButtonElement,
      collaborationButton: buttons[1] as HTMLButtonElement,
    };
  }

  function setInputValue(input: HTMLInputElement, value: string) {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!valueSetter) throw new Error("missing input value setter");

    act(() => {
      valueSetter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    });
  }

  function typeInput(input: HTMLInputElement, value: string) {
    for (let index = 1; index <= value.length; index += 1) {
      setInputValue(input, value.slice(0, index));
    }
  }


  it("keeps the project directory before the group name and removes quick select", () => {
    const labels = Array.from(container?.querySelectorAll("label") || []).map((label) => label.textContent || "");

    expect(labels.indexOf("Project directory")).toBeLessThan(labels.indexOf("Group name"));
    expect(container?.textContent).not.toContain("Quick select");
    expect(container?.textContent).not.toContain("Directory will be created if needed");
  });

  it("keeps the group name synced to the typed directory basename", () => {
    const { pathInput, nameInput } = getInputs();

    typeInput(pathInput, "/tmp/debug-name-sync");

    expect(nameInput.value).toBe("debug-name-sync");
  });

  it("stops auto-sync after the user edits the group name manually", () => {
    const { pathInput, nameInput } = getInputs();

    typeInput(pathInput, "/tmp/debug-name-sync");
    setInputValue(nameInput, "Custom title");
    typeInput(pathInput, "/tmp/debug-name-sync-v2");

    expect(nameInput.value).toBe("Custom title");
  });

  it("allows switching the group mode before creation", () => {
    const { soloButton, collaborationButton } = getModeButtons();

    expect(soloButton.getAttribute("aria-pressed")).toBe("true");
    expect(collaborationButton.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      collaborationButton.click();
    });

    expect(soloButton.getAttribute("aria-pressed")).toBe("false");
    expect(collaborationButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("creates a new folder from the directory browser and selects it", async () => {
    act(() => {
      root?.render(<BrowserHarness />);
    });

    expect(container?.textContent).toContain("Choose project directory");

    await act(async () => {
      Array.from(container?.querySelectorAll("button") || [])
        .find((button) => button.textContent === "New folder")
        ?.click();
    });

    const folderInput = Array.from(container?.querySelectorAll("input") || []).find(
      (input) => (input as HTMLInputElement).placeholder === "Folder name",
    ) as HTMLInputElement | undefined;
    expect(folderInput).toBeTruthy();

    setInputValue(folderInput!, "fresh-workspace");

    await act(async () => {
      Array.from(container?.querySelectorAll("button") || [])
        .find((button) => button.textContent === "Create folder")
        ?.click();
    });

    const { pathInput, nameInput } = getInputs();
    expect(pathInput.value).toBe("/tmp/fresh-workspace");
    expect(nameInput.value).toBe("fresh-workspace");
    expect(container?.textContent).toContain("/tmp/fresh-workspace");
  });
});
