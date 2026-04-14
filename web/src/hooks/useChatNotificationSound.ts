import { useCallback, useEffect, useState } from "react";

import type { ChatNotificationSoundId, ChatNotificationSoundPreference } from "../types";
import {
  playChatNotificationSoundById,
  primeChatNotificationSounds,
  primeChatNotificationSoundById,
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
