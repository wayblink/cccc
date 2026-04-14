import { useEffect, useLayoutEffect, useRef } from "react";
import type { ChatSlotId } from "../stores/useUIStore";

type UseAppGroupLifecycleOptions = {
  selectedGroupId: string;
  selectedSlotId: ChatSlotId;
  destGroupId: string;
  sendGroupId: string;
  hasReplyTarget: boolean;
  hasComposerFiles: boolean;
  setDestGroupId: (groupId: string) => void;
  switchContext: (
    prevGroupId: string | null,
    prevSlotId: ChatSlotId | null,
    nextGroupId: string | null,
    nextSlotId: ChatSlotId | null,
  ) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  resetDragDrop: () => void;
  resetMountedActorIds: () => void;
  setActiveTab: (tab: string) => void;
  closeChatWindow: () => void;
  loadGroup: (groupId: string) => void;
  connectStream: (groupId: string) => void;
  cleanupSSE: () => void;
};

export function useAppGroupLifecycle({
  selectedGroupId,
  selectedSlotId,
  destGroupId,
  sendGroupId,
  hasReplyTarget,
  hasComposerFiles,
  setDestGroupId,
  switchContext,
  fileInputRef,
  resetDragDrop,
  resetMountedActorIds,
  setActiveTab,
  closeChatWindow,
  loadGroup,
  connectStream,
  cleanupSSE,
}: UseAppGroupLifecycleOptions) {
  const prevGroupIdRef = useRef<string | null>(null);
  const prevSlotIdRef = useRef<ChatSlotId | null>(null);

  useEffect(() => {
    const gid = String(selectedGroupId || "").trim();
    if (!gid) return;
    if (!destGroupId) {
      setDestGroupId(gid);
    }
  }, [destGroupId, selectedGroupId, setDestGroupId]);

  useEffect(() => {
    const gid = String(selectedGroupId || "").trim();
    if (!gid) return;
    if (hasReplyTarget || hasComposerFiles) {
      if (sendGroupId && sendGroupId !== gid) {
        setDestGroupId(gid);
      }
    }
  }, [hasComposerFiles, hasReplyTarget, selectedGroupId, sendGroupId, setDestGroupId]);

  // 切组前先切换 composer 归属，避免首帧读到旧组草稿。
  useLayoutEffect(() => {
    switchContext(
      prevGroupIdRef.current,
      prevSlotIdRef.current,
      selectedGroupId || null,
      selectedSlotId || null,
    );
    prevGroupIdRef.current = selectedGroupId || null;
    prevSlotIdRef.current = selectedSlotId || null;
  }, [selectedGroupId, selectedSlotId, switchContext]);

  useEffect(() => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    resetDragDrop();
    resetMountedActorIds();
    setActiveTab("chat");
    closeChatWindow();

    if (!selectedGroupId) return;

    loadGroup(selectedGroupId);
    connectStream(selectedGroupId);

    return () => {
      cleanupSSE();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);
}
