
import {
  type LucideIcon,
  Clipboard, Check, Copy, Rocket,
  Play, Pause, Square,
  Clock3, Settings, Pencil, EllipsisVertical, Menu, X, Search,
  LayoutPanelLeft, AppWindow, Maximize2, Minimize2, Monitor,
  TextCursorInput, Compass, Plus, House, Folder, Download,
  Sun, Moon, SquareTerminal, Bookmark, Inbox, RefreshCw, Trash2,
  ChevronDown, Send, Paperclip, Mic, Camera, Reply, Power,
  CircleAlert, Info, Image, File, MessageSquare, MessageSquareText,
  Bell, Sparkles, ArrowDown, ChevronLeft, ChevronRight, Globe,
  GripVertical, PawPrint,
} from "lucide-react";

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
}

interface GroupModeIconProps extends IconProps {
  mode: "solo" | "collaboration";
  soloVariant?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export function GroupModeIcon({ className, size = 16, mode, soloVariant = 7 }: GroupModeIconProps) {
  if (mode === "solo") {
    if (soloVariant === 2) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="12" cy="12" r="2.4" fill="currentColor" opacity="0.25" />
          <circle cx="12" cy="12" r="2.4" />
          <circle cx="12" cy="12" r="5.4" opacity="0.55" />
          <circle cx="12" cy="12" r="8.4" opacity="0.3" />
        </svg>
      );
    }
    if (soloVariant === 1) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M5 4l5.2 12 1.8-4.2 4.2-1.8L5 4z" fill="currentColor" opacity="0.2" />
          <path d="M5 4l5.2 12 1.8-4.2 4.2-1.8L5 4z" />
          <rect x="14.5" y="12.5" width="5.5" height="4.5" rx="1.4" />
          <path d="M15.5 12.5v-1a2.5 2.5 0 0 1 2.5-2.5h0a2.5 2.5 0 0 1 2.5 2.5v1" />
        </svg>
      );
    }
    if (soloVariant === 3) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="12" cy="12" r="2.6" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="12" r="6.2" opacity="0.45" />
          <path d="M12 3.8v2.6" />
          <path d="M12 17.6v2.6" />
          <path d="M3.8 12h2.6" />
          <path d="M17.6 12h2.6" />
        </svg>
      );
    }
    if (soloVariant === 4) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M4 13c1.4 0 1.4-2 2.8-2s1.4 2 2.8 2 1.4-2 2.8-2 1.4 2 2.8 2 1.4-2 2.8-2 1.4 2 2.8 2" opacity="0.8" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="12" r="2.4" />
        </svg>
      );
    }
    if (soloVariant === 5) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <ellipse cx="12" cy="12" rx="8.5" ry="5" opacity="0.45" />
          <ellipse cx="12" cy="12" rx="5" ry="8.5" opacity="0.3" />
          <circle cx="16.8" cy="9.4" r="1.8" fill="currentColor" opacity="0.2" />
          <circle cx="16.8" cy="9.4" r="1.8" />
        </svg>
      );
    }
    if (soloVariant === 6) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" opacity="0.08" />
          <rect x="5" y="5" width="14" height="14" rx="3" />
          <path d="M13.6 7.5l-2.2 3.3h1.9l-2.1 3.2" />
        </svg>
      );
    }
    if (soloVariant === 7) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <rect x="5" y="6" width="14" height="12" rx="2.8" fill="currentColor" opacity="0.08" />
          <rect x="5" y="6" width="14" height="12" rx="2.8" />
          <path d="M8.4 11l2 1.9-2 1.9" />
          <path d="M12.1 14.8h3" />
        </svg>
      );
    }
    if (soloVariant === 8) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="8" cy="12" r="2.7" fill="currentColor" opacity="0.16" />
          <circle cx="16" cy="12" r="2.7" fill="currentColor" opacity="0.16" />
          <circle cx="8" cy="12" r="2.7" />
          <circle cx="16" cy="12" r="2.7" />
          <path d="M10.8 12h2.4" />
        </svg>
      );
    }
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <rect x="5" y="6" width="14" height="12" rx="2.8" fill="currentColor" opacity="0.08" />
        <rect x="5" y="6" width="14" height="12" rx="2.8" />
        <path d="M8.4 11l2 1.9-2 1.9" />
        <path d="M12.1 14.8h3" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="6" cy="12" r="2.5" fill="currentColor" opacity="0.14" />
      <circle cx="18" cy="7" r="2.5" fill="currentColor" opacity="0.14" />
      <circle cx="18" cy="17" r="2.5" fill="currentColor" opacity="0.14" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <path d="M8.5 11l7-3" />
      <path d="M8.5 13l7 3" />
    </svg>
  );
}

export function ScriptIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M9 11h6" />
      <path d="M9 15h6" />
      <path d="m10 19 2-2-2-2" />
    </svg>
  );
}
function createIcon(Icon: LucideIcon, defaultStrokeWidth = 1.5) {
  function WrappedIcon({ size = 18, strokeWidth = defaultStrokeWidth, absoluteStrokeWidth = true, className }: IconProps) {
    return <Icon size={size} strokeWidth={strokeWidth} absoluteStrokeWidth={absoluteStrokeWidth} className={className} />;
  }
  WrappedIcon.displayName = Icon.displayName || "Icon";
  return WrappedIcon;
}

function createControlIcon(Icon: LucideIcon, defaultStrokeWidth = 1.75) {
  function WrappedIcon({
    size = 18,
    strokeWidth = defaultStrokeWidth,
    absoluteStrokeWidth = true,
    ...props
  }: IconProps) {
    return (
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth={absoluteStrokeWidth}
        fill="none"
        {...props}
      />
    );
  }

  WrappedIcon.displayName = `Control${Icon.displayName || "Icon"}`;
  return WrappedIcon;
}

export const ClipboardIcon = createIcon(Clipboard);
export const CheckIcon = createIcon(Check, 2);
export const CopyIcon = createIcon(Copy);
export const RocketIcon = createIcon(Rocket);
export const PlayIcon = createControlIcon(Play);
export const PauseIcon = createControlIcon(Pause);
export const StopIcon = createControlIcon(Square);
export const ClockIcon = createIcon(Clock3);
export const SettingsIcon = createIcon(Settings);
export const EditIcon = createIcon(Pencil);
export const MoreIcon = createIcon(EllipsisVertical);
export const MenuIcon = createIcon(Menu);
export const CloseIcon = createIcon(X);
export const SearchIcon = createIcon(Search);
export const SplitViewIcon = createIcon(LayoutPanelLeft);
export const WindowViewIcon = createIcon(AppWindow);
export const ExpandIcon = createIcon(Maximize2);
export const CollapseIcon = createIcon(Minimize2);
export const MaximizeIcon = createIcon(Maximize2);
export const MonitorIcon = createIcon(Monitor);
export const TextSizeIcon = createIcon(TextCursorInput, 2);
export const CompassIcon = createIcon(Compass);
export const PlusIcon = createIcon(Plus);
export const HomeIcon = createIcon(House);
export const FolderIcon = createIcon(Folder);
export const DownloadIcon = createIcon(Download);
export const SunIcon = createIcon(Sun);
export const MoonIcon = createIcon(Moon);
export const TerminalIcon = createIcon(SquareTerminal);
export const BookmarkIcon = createIcon(Bookmark, 1.9);
export const InboxIcon = createIcon(Inbox);
export const RefreshIcon = createIcon(RefreshCw);
export const TrashIcon = createIcon(Trash2);
export const ChevronDownIcon = createIcon(ChevronDown);
export const SendIcon = createIcon(Send);
export const AttachmentIcon = createIcon(Paperclip);
export const MicrophoneIcon = createIcon(Mic);
export const CameraIcon = createIcon(Camera, 1.9);
export const ReplyIcon = createIcon(Reply);
export const PowerIcon = createIcon(Power);
export const AlertIcon = createIcon(CircleAlert, 2);
export const InfoIcon = createIcon(Info, 2);
export const ImageIcon = createIcon(Image);
export const FileIcon = createIcon(File);
export const MessageSquareIcon = createIcon(MessageSquare);
export const MessageSquareTextIcon = createIcon(MessageSquareText);
export const BellIcon = createIcon(Bell);
export const SparklesIcon = createIcon(Sparkles);
export const ArrowDownIcon = createIcon(ArrowDown, 2);
export const ChevronLeftIcon = createIcon(ChevronLeft);
export const ChevronRightIcon = createIcon(ChevronRight);
export const GlobeIcon = createIcon(Globe);
export const GripIcon = createIcon(GripVertical);
export const PetIcon = createIcon(PawPrint);
