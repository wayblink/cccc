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
      "createGroup.groupName": "Group name",
      "createGroup.groupNamePlaceholder": "Working group name",
      "createGroup.modeLabel": "Group mode",
      "createGroup.interactiveMode": "Interactive",
      "createGroup.interactiveModeHint": "Independent sessions without collaboration routing",
      "createGroup.collaborationMode": "Collaboration",
      "createGroup.collaborationModeHint": "Original multi-agent collaboration semantics",
      "createGroup.blueprintLabel": "Blueprint",
      "createGroup.blueprintHint": "Optional template",
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
  const [createGroupMode, setCreateGroupMode] = useState<"interactive" | "collaboration">("interactive");

  return (
    <CreateGroupModal
      isOpen
      busy=""
      dirSuggestions={[]}
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
    const inputs = Array.from(container?.querySelectorAll("input") || []);
    expect(inputs).toHaveLength(3);
    return {
      pathInput: inputs[0] as HTMLInputElement,
      nameInput: inputs[1] as HTMLInputElement,
    };
  }

  function getModeButtons() {
    const buttons = Array.from(container?.querySelectorAll('button[aria-pressed]') || []);
    expect(buttons).toHaveLength(2);
    return {
      interactiveButton: buttons[0] as HTMLButtonElement,
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
    const { interactiveButton, collaborationButton } = getModeButtons();

    expect(interactiveButton.getAttribute("aria-pressed")).toBe("true");
    expect(collaborationButton.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      collaborationButton.click();
    });

    expect(interactiveButton.getAttribute("aria-pressed")).toBe("false");
    expect(collaborationButton.getAttribute("aria-pressed")).toBe("true");
  });
});
