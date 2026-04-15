import { beforeEach, describe, expect, it, vi } from "vitest";

function makeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
    clear: vi.fn(() => {
      data.clear();
    }),
  };
}

const localStorageMock = makeStorage();
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", { localStorage: localStorageMock });

import {
  CHAT_NOTIFICATION_SOUND_IDS,
  DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE,
  getChatNotificationSoundUrl,
  normalizeChatNotificationSoundPreference,
  readStoredChatNotificationSoundPreference,
} from "../../src/utils/chatNotificationSound";

describe("chatNotificationSound", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorageMock.clear();
  });

  it("falls back to the default preference when persisted payload is malformed", () => {
    localStorageMock.setItem("cccc-chat-notification-sound", "{bad json");
    expect(readStoredChatNotificationSoundPreference()).toEqual(
      DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE,
    );
  });

  it("keeps a valid soundId even when enabled is false", () => {
    expect(
      normalizeChatNotificationSoundPreference({ enabled: false, soundId: "rooster" }),
    ).toEqual({
      enabled: false,
      soundId: "rooster",
    });
  });

  it("accepts the kept, renamed, and split horse sounds while dropping removed ids", () => {
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "horse-neigh" }),
    ).toEqual({
      enabled: true,
      soundId: "horse-neigh",
    });
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "horse-neigh-2" }),
    ).toEqual({
      enabled: true,
      soundId: "horse-neigh-2",
    });
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "horse-neigh-3" }),
    ).toEqual({
      enabled: true,
      soundId: "horse-neigh-3",
    });
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "duck-quack" }),
    ).toEqual({
      enabled: true,
      soundId: "duck-quack",
    });
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "drum-hit" }),
    ).toEqual({
      enabled: true,
      soundId: "drum-hit",
    });
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "cicada-buzz" }),
    ).toEqual(DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE);
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "fahhhhh" }),
    ).toEqual(DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE);
    expect(
      normalizeChatNotificationSoundPreference({ enabled: true, soundId: "abstract-sound2" }),
    ).toEqual(DEFAULT_CHAT_NOTIFICATION_SOUND_PREFERENCE);
  });

  it("resolves the built-in asset URL for a known sound", () => {
    expect(getChatNotificationSoundUrl("abstract-sound1")).toBe(
      `${import.meta.env.BASE_URL}sounds/abstract-sound1.wav`,
    );
  });

  it("can eagerly warm all built-in sounds for instant setting previews", async () => {
    class MockAudio {
      static instances: MockAudio[] = [];

      preload = "";
      currentTime = 0;
      paused = true;
      load = vi.fn();
      play = vi.fn(async () => {
        this.paused = false;
      });
      pause = vi.fn(() => {
        this.paused = true;
      });

      constructor(public readonly src: string) {
        MockAudio.instances.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);

    const mod = await import("../../src/utils/chatNotificationAudio");
    const primeAll = (
      mod as typeof mod & {
        primeChatNotificationSounds?: () => number;
      }
    ).primeChatNotificationSounds;

    expect(typeof primeAll).toBe("function");
    expect(primeAll?.()).toBe(CHAT_NOTIFICATION_SOUND_IDS.length);
    expect(primeAll?.()).toBe(CHAT_NOTIFICATION_SOUND_IDS.length);
    expect(MockAudio.instances).toHaveLength(CHAT_NOTIFICATION_SOUND_IDS.length);

    expect(new Set(MockAudio.instances.map((instance) => instance.src)).size).toBe(
      CHAT_NOTIFICATION_SOUND_IDS.length,
    );
    expect(MockAudio.instances.every((instance) => instance.preload === "auto")).toBe(true);
    expect(MockAudio.instances.every((instance) => instance.load.mock.calls.length === 1)).toBe(true);

    await expect(mod.playChatNotificationSoundById("duck-quack")).resolves.toBe(true);
    expect(MockAudio.instances).toHaveLength(CHAT_NOTIFICATION_SOUND_IDS.length);
  });

  it("primes the selected audio once and reuses it for repeated plays", async () => {
    class MockAudio {
      static instances: MockAudio[] = [];

      preload = "";
      currentTime = 1;
      muted = false;
      paused = true;
      readyState = 0;
      load = vi.fn();
      play = vi.fn(async () => {
        if (this.muted) {
          this.readyState = 4;
          this.paused = false;
          return;
        }
        if (this.readyState < 4) {
          throw new Error("cold audio");
        }
        this.paused = false;
      });
      pause = vi.fn(() => {
        this.paused = true;
      });

      constructor(public readonly src: string) {
        MockAudio.instances.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);

    const mod = await import("../../src/utils/chatNotificationAudio");
    const preload = (
      mod as typeof mod & {
        primeChatNotificationSoundById?: (soundId: "rooster") => boolean;
      }
    ).primeChatNotificationSoundById;

    expect(typeof preload).toBe("function");
    expect(preload?.("rooster")).toBe(true);
    await vi.waitFor(() => {
      expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(1);
      expect(MockAudio.instances[0]?.pause).toHaveBeenCalledTimes(1);
      expect(MockAudio.instances[0]?.readyState).toBe(4);
    });
    await expect(mod.playChatNotificationSoundById("rooster")).resolves.toBe(true);
    await expect(mod.playChatNotificationSoundById("rooster")).resolves.toBe(true);

    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0]?.src).toBe(getChatNotificationSoundUrl("rooster"));
    expect(MockAudio.instances[0]?.preload).toBe("auto");
    expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(3);
    expect(MockAudio.instances[0]?.pause).toHaveBeenCalledTimes(2);
    expect(MockAudio.instances[0]?.currentTime).toBeGreaterThan(0);
    expect(MockAudio.instances[0]?.muted).toBe(false);
  });

  it("warns without throwing when preview playback fails", async () => {
    const play = vi.fn().mockRejectedValue(new Error("blocked"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    class MockAudio {
      play = play;
    }
    vi.stubGlobal("Audio", MockAudio);

    const mod = await import("../../src/utils/chatNotificationAudio");
    await expect(mod.playChatNotificationSoundById("rooster")).resolves.toBe(false);
    expect(play).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});
