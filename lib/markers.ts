import { Bookmark, MessageSquare, type LucideIcon } from "lucide-react";

/** Seconds before a cue marker to land when jumping (rehearsal lead-in). */
export const MARKER_CUE_LEAD_SECONDS = 3;

export type MarkerType = "cue" | "note";

export function normalizeMarkerType(raw: unknown): MarkerType {
  if (raw === "cue") return "cue";
  return "note";
}

export function markerIsJumpable(type: MarkerType): boolean {
  return type === "cue";
}

export const MARKER_META: Record<
  MarkerType,
  {
    label: string;
    Icon: LucideIcon;
    dot: string;
    tint: string;
    pin: string;
  }
> = {
  cue: {
    label: "Cue",
    Icon: Bookmark,
    dot: "bg-[var(--melodia-red)]",
    tint: "text-[var(--accent-text)] bg-[var(--accent-muted)] ring-[var(--accent-ring)]",
    pin: "bg-[var(--melodia-red)]/70",
  },
  note: {
    label: "Note",
    Icon: MessageSquare,
    dot: "bg-sky-400",
    tint: "text-sky-200 bg-sky-500/15 ring-sky-400/40",
    pin: "bg-sky-400/70",
  },
};

export const MARKER_TYPE_OPTIONS = (["cue", "note"] as const).map((value) => ({
  value,
  ...MARKER_META[value],
}));
