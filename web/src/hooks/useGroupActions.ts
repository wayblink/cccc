// Group action helpers (start/stop/state).
import { useCallback } from "react";
import { useGroupStore, useUIStore } from "../stores";
import * as api from "../services/api";

export function useGroupActions() {
  const {
    selectedGroupId,
    groupDoc,
    setGroupDoc,
    applyDeletedGroup,
    refreshGroups,
    refreshActors,
  } = useGroupStore();

  const { setBusy, showError } = useUIStore();

  // Start group
  const handleStartGroup = useCallback(async () => {
    if (!selectedGroupId) return;
    setBusy("group-start");
    try {
      const resp = await api.startGroup(selectedGroupId);
      if (!resp.ok) {
        showError(`${resp.error.code}: ${resp.error.message}`);
        return;
      }
      await refreshActors();
      await refreshGroups();
    } finally {
      setBusy("");
    }
  }, [selectedGroupId, setBusy, showError, refreshActors, refreshGroups]);

  // Stop group
  const handleStopGroup = useCallback(async () => {
    if (!selectedGroupId) return;
    setBusy("group-stop");
    try {
      const resp = await api.stopGroup(selectedGroupId);
      if (!resp.ok) {
        showError(`${resp.error.code}: ${resp.error.message}`);
        return;
      }
      await refreshActors();
      await refreshGroups();
    } finally {
      setBusy("");
    }
  }, [selectedGroupId, setBusy, showError, refreshActors, refreshGroups]);

  // Set group state
  const handleSetGroupState = useCallback(
    async (s: "active" | "idle" | "paused") => {
      if (!selectedGroupId) return;
      setBusy(s === "active" ? "group-activate" : s === "paused" ? "group-pause" : "group-idle");
      try {
        const resp = await api.setGroupState(selectedGroupId, s);
        if (!resp.ok) {
          showError(`${resp.error.code}: ${resp.error.message}`);
          return;
        }
        setGroupDoc(groupDoc ? {
          ...groupDoc,
          state: s,
          runtime_status: {
            runtime_running: groupDoc.runtime_status?.runtime_running ?? false,
            running_actor_count: groupDoc.runtime_status?.running_actor_count ?? 0,
            has_running_foreman: groupDoc.runtime_status?.has_running_foreman ?? false,
            ...groupDoc.runtime_status,
            lifecycle_state: s,
          },
        } : null);
        // When resuming to active and no actors are running, also start
        // the group so processes get relaunched (not just the state flag).
        if (s === "active" && groupDoc && !groupDoc.running) {
          const startResp = await api.startGroup(selectedGroupId);
          if (!startResp.ok) {
            showError(`${startResp.error.code}: ${startResp.error.message}`);
          }
          await refreshActors();
        }
        await refreshGroups();
      } finally {
        setBusy("");
      }
    },
    [selectedGroupId, groupDoc, setBusy, showError, setGroupDoc, refreshGroups, refreshActors]
  );

  const handleDeleteGroup = useCallback(async (groupId?: string) => {
    const targetGroupId = String(groupId || selectedGroupId || "").trim();
    if (!targetGroupId) return;
    setBusy("group-delete");
    try {
      const resp = await api.deleteGroup(targetGroupId);
      if (!resp.ok) {
        showError(`${resp.error.code}: ${resp.error.message}`);
        return;
      }
      applyDeletedGroup(targetGroupId);
      await refreshGroups();
    } finally {
      setBusy("");
    }
  }, [selectedGroupId, setBusy, showError, applyDeletedGroup, refreshGroups]);

  return {
    handleStartGroup,
    handleStopGroup,
    handleSetGroupState,
    handleDeleteGroup,
  };
}
