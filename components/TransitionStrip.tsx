"use client";

import {
  clamp,
  rehearsalDuration,
  segmentGlobalOffsets,
} from "@/lib/rehearsal";
import { MoreVertical } from "lucide-react";
import { useTimelineStore } from "@/store/useTimelineStore";

const SEGMENT_TINT = [
  "from-violet-500/30 to-violet-600/20 ring-violet-400/35",
  "from-sky-500/25 to-sky-600/15 ring-sky-400/35",
  "from-fuchsia-500/25 to-fuchsia-600/15 ring-fuchsia-400/35",
];

export default function TransitionStrip() {
  const tracks = useTimelineStore((s) => s.project.tracks);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const jumpToTrack = useTimelineStore((s) => s.jumpToTrack);
  const openTrackSegmentsModal = useTimelineStore(
    (s) => s.openTrackSegmentsModal,
  );

  const total = rehearsalDuration(tracks);
  const offsets = segmentGlobalOffsets(tracks);
  if (tracks.length === 0 || total <= 0) return null;

  return (
    <div className="space-y-1.5 px-0.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
        <span>Transitions</span>
        <span className="font-mono normal-case text-zinc-400">
          {tracks.length} blocks · {formatShort(total)} total
        </span>
      </div>
      <div className="flex h-11 w-full gap-1 overflow-hidden rounded-lg bg-zinc-900/80 p-1 ring-1 ring-zinc-800">
        {tracks.map((tr, i) => {
          const len = Math.max(0.1, tr.segmentEnd - tr.segmentStart);
          const flex = Math.max(0.15, len / total);
          const isActive = i === activeTrackIndex;
          const tint = SEGMENT_TINT[i % SEGMENT_TINT.length];
          return (
            <div
              key={tr.id}
              style={{ flex }}
              className={`flex min-w-0 gap-0.5 rounded-md ring-1 transition ${
                isActive ? tint : "bg-zinc-800/90 ring-zinc-700"
              }`}
            >
              <button
                type="button"
                onClick={() => jumpToTrack(i)}
                className="relative min-w-0 flex-1 px-1.5 py-1.5 text-left"
              >
                <span className="block truncate text-[11px] font-semibold text-zinc-100">
                  {tr.name}
                </span>
                <span className="mt-0.5 block font-mono text-[9px] text-zinc-400">
                  {formatShort(tr.segmentStart)}–{formatShort(tr.segmentEnd)}
                </span>
                {isActive ? (
                  <span
                    className="pointer-events-none absolute bottom-0 top-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    style={{
                      left: `${clamp(((currentTime - offsets[i]) / len) * 100, 0, 100)}%`,
                    }}
                  />
                ) : null}
              </button>
              <button
                type="button"
                aria-label={`Edit segment times (${tr.name})`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openTrackSegmentsModal(i);
                }}
                className="flex w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-black/25 hover:text-zinc-200"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
