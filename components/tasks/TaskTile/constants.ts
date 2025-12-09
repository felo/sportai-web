import { CheckCircledIcon, CrossCircledIcon, UpdateIcon } from "@radix-ui/react-icons";
import type { Task, StatusConfig } from "./types";

// Common codec mappings based on container format
export const FORMAT_CODEC_MAP: Record<string, string> = {
  "MP4": "H.264/AVC",
  "MOV": "H.264/ProRes",
  "WEBM": "VP8/VP9",
  "MKV": "H.264/H.265",
  "AVI": "Various",
  "M4V": "H.264",
  "3GP": "H.263/H.264",
  "OGV": "Theora",
};

// Sport badge colors
export const SPORT_COLORS: Record<Task["sport"], "cyan" | "orange" | "green"> = {
  padel: "cyan",
  tennis: "orange",
  pickleball: "green",
};

// Sport placeholder text (shown when no thumbnail)
export const SPORT_ICONS: Record<Task["sport"], string> = {
  padel: "P",
  tennis: "T",
  pickleball: "PB",
};

// Background colors for no-thumbnail state
export const SPORT_BG_COLORS: Record<Task["sport"], string> = {
  padel: "var(--cyan-4)",
  tennis: "var(--orange-4)",
  pickleball: "var(--green-4)",
};

// Task status configuration
export const STATUS_CONFIG: Record<Task["status"], StatusConfig> = {
  pending: { color: "orange", icon: UpdateIcon, label: "Pending" },
  processing: { color: "blue", icon: UpdateIcon, label: "Processing" },
  completed: { color: "green", icon: CheckCircledIcon, label: "Completed" },
  failed: { color: "red", icon: CrossCircledIcon, label: "Failed" },
};


