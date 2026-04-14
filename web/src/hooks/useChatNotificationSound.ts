import { useCallback, useEffect, useState } from "react";

import type { ChatNotificationSoundId, ChatNotificationSoundPreference } from "../types";
import {
  playChatNotificationSoundById,
  primeChatNotificationSounds,
  primeChatNotificationSoundById,
  resumeChatNotificationAudioContext,
} from "../utils/chatNotificationAudio";
import {
  normalizeChatNotificationSoundPreference,
  readStoredChatNotificationSoundPreference,
  writeStoredChatNotificationSoundPreference,
} from "../utils/chatNotificationSound";

export function useChatNotificationSound() {
  const [chatNotificationSound, setChatNotificationSoundState] = useState<ChatNotificationSoundPreference>(
    readStoredChatNotificationSoundPreference,
  );

  useEffect(() => {
    writeStoredChatNotificationSoundPreference(chatNotificationSound);
  }, [chatNotificationSound]);

  useEffect(() => {
    primeChatNotificationSounds();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const warmAllSounds = () => {
      void resumeChatNotificationAudioContext();
      primeChatNotificationSounds();
      window.removeEventListener("pointerdown", warmAllSounds);
      window.removeEventListener("keydown", warmAllSounds);
    };

    window.addEventListener("pointerdown", warmAllSounds, { once: true, passive: true });
    window.addEventListener("keydown", warmAllSounds, { once: true });
    return () => {
      window.removeEventListener("pointerdown", warmAllSounds);
      window.removeEventListener("keydown", warmAllSounds);
    };
  }, []);

  useEffect(() => {
    primeChatNotificationSoundById(chatNotificationSound.soundId);
  }, [chatNotificationSound.soundId]);

  const setChatNotificationSound = useCallback((value: ChatNotificationSoundPreference) => {
    setChatNotificationSoundState(normalizeChatNotificationSoundPreference(value));
  }, []);

  const previewChatNotificationSound = useCallback((soundId?: ChatNotificationSoundId) => {
    const nextSoundId = soundId ?? chatNotificationSound.soundId;
    return playChatNotificationSoundById(nextSoundId);
  }, [chatNotificationSound.soundId]);

  return {
    chatNotificationSound,
    setChatNotificationSound,
    previewChatNotificationSound,
  };
}
