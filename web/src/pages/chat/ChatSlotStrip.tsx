import { classNames } from "../../utils/classNames";
import type { ChatSlotId } from "../../stores/useUIStore";

export interface ChatSlotStripSlot {
  slotId: ChatSlotId;
  actorId: string | null;
  label: string;
  hasUnreadDot: boolean;
}

interface ChatSlotStripProps {
  isDark: boolean;
  slots: ChatSlotStripSlot[];
  selectedSlotId: ChatSlotId;
  onSelectSlot: (slotId: ChatSlotId) => void;
}

export function ChatSlotStrip({
  isDark,
  slots,
  selectedSlotId,
  onSelectSlot,
}: ChatSlotStripProps) {
  return (
    <div
      className={classNames(
        "inline-flex max-w-full items-center gap-1 rounded-full border p-1 backdrop-blur-xl",
        isDark
          ? "border-white/10 bg-slate-900/60 shadow-black/30 ring-1 ring-white/5"
          : "border-black/5 bg-white/70 shadow-gray-200/50 ring-1 ring-black/5",
      )}
      role="tablist"
      aria-label="Chat slots"
    >
      {slots.map((slot) => {
        const active = slot.slotId === selectedSlotId;
        return (
          <button
            key={slot.slotId}
            type="button"
            data-chat-slot-id={slot.slotId}
            onClick={() => onSelectSlot(slot.slotId)}
            aria-pressed={active}
            className={classNames(
              "relative inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
              active
                ? "bg-blue-600 text-white shadow-sm"
                : isDark
                  ? "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            <span className="truncate">{slot.label}</span>
            {slot.actorId && slot.hasUnreadDot ? (
              <span
                data-chat-slot-unread="true"
                className="h-2 w-2 flex-shrink-0 rounded-full bg-rose-500"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
