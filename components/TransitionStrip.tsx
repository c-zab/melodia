"use client";

import { rehearsalDuration } from "@/lib/rehearsal";
import { MoreVertical } from "lucide-react";
import { useTimelineStore } from "@/store/useTimelineStore";

const SEGMENT_TINT = [
  "from-cyan-500/25 to-cyan-600/15 ring-cyan-400/40",
  "from-sky-500/20 to-sky-600/12 ring-sky-400/35",
  "from-teal-500/20 to-teal-600/12 ring-teal-400/35",
];

export default function TransitionStrip() {
  const tracks = useTimelineStore((s) => s.project.tracks);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const jumpToTrack = useTimelineStore((s) => s.jumpToTrack);
  const openTrackSegmentsModal = useTimelineStore(
    (s) => s.openTrackSegmentsModal,
  );

  const total = rehearsalDuration(tracks);
  if (tracks.length === 0 || total <= 0) return null;

  return (
    <div className="space-y-1.5 px-0.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
        <span>Transitions</span>
        <span className="font-mono normal-case text-slate-400">
          {tracks.length} blocks · {formatShort(total)} total
        </span>
      </div>
      <div className="flex h-11 w-full gap-1 overflow-hidden rounded-lg bg-slate-900/80 p-1 ring-1 ring-slate-800">
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
                isActive ? tint : "bg-slate-800/90 ring-slate-700"
              }`}
            >
              <button
                type="button"
                onClick={() => jumpToTrack(i)}
                className="min-w-0 flex-1 px-1.5 py-1.5 text-left"
              >
                <span className="block truncate text-[11px] font-semibold text-slate-100">
                  {tr.name}
                </span>
                <span className="mt-0.5 block font-mono text-[9px] text-slate-400">
                  {formatShort(tr.segmentStart)}–{formatShort(tr.segmentEnd)}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Edit segment times (${tr.name})`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openTrackSegmentsModal(i);
                }}
                className="flex w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-black/25 hover:text-slate-200"
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
