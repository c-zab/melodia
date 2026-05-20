"use client";

import { Pause, Play, Plus, Repeat, X } from "lucide-react";

import { rehearsalDuration } from "@/lib/rehearsal";
import { useTimelineStore } from "@/store/useTimelineStore";
import { formatTime, playPause, skipSeconds } from "@/lib/wavesurfer";

const LOOP_LENGTH_SECONDS = 8;

export default function PlaybackControls() {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const tracks = useTimelineStore((s) => s.project.tracks);
  const total = rehearsalDuration(tracks);
  const loopRegion = useTimelineStore((s) => s.project.loopRegion);
  const setLoopRegion = useTimelineStore((s) => s.setLoopRegion);
  const toggleLoopEnabled = useTimelineStore((s) => s.toggleLoopEnabled);
  const clearLoopRegion = useTimelineStore((s) => s.clearLoopRegion);
  const addMarker = useTimelineStore((s) => s.addMarker);

  const handleAddMarker = () => addMarker(currentTime, "action");

  const handleLoopButton = () => {
    if (!loopRegion) {
      if (total <= 0) return;
      const start = Math.max(0, currentTime);
      const end = Math.min(total, start + LOOP_LENGTH_SECONDS);
      setLoopRegion(start, end);
      return;
    }
    toggleLoopEnabled();
  };

  const loopButtonLabel = !loopRegion
    ? "Add loop"
    : loopRegion.enabled
      ? "Looping"
      : "Loop off";

  return (
    <div className="sticky bottom-0 z-30 w-full border-t border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 sm:border-0 sm:bg-transparent">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          {loopRegion ? (
            <span className="flex items-center gap-2 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] text-violet-200 ring-1 ring-violet-400/30">
              Loop {formatTime(loopRegion.start)} – {formatTime(loopRegion.end)}
              <button
                type="button"
                onClick={clearLoopRegion}
                aria-label="Clear loop"
                className="rounded-full p-0.5 text-violet-200 hover:bg-violet-500/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          <span>{formatTime(total)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-center sm:gap-4">
          <ControlButton onClick={() => skipSeconds(-5)} aria-label="Back 5 seconds">
            <span className="text-xs font-semibold">-5s</span>
          </ControlButton>

          <button
            type="button"
            onClick={playPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-14 w-14 place-items-center rounded-full bg-violet-500 text-zinc-950 shadow-lg shadow-violet-500/30 transition hover:bg-violet-400 active:scale-[0.97] sm:h-16 sm:w-16"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-0.5 h-6 w-6" />
            )}
          </button>

          <ControlButton onClick={() => skipSeconds(5)} aria-label="Forward 5 seconds">
            <span className="text-xs font-semibold">+5s</span>
          </ControlButton>

          <div className="hidden h-8 w-px bg-zinc-800 sm:block" />

          <ControlButton onClick={handleAddMarker} aria-label="Add marker">
            <Plus className="h-5 w-5" />
          </ControlButton>

          <ControlButton
            onClick={handleLoopButton}
            aria-label={loopButtonLabel}
            active={Boolean(loopRegion?.enabled)}
          >
            <Repeat className="h-5 w-5" />
          </ControlButton>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-500 sm:hidden">
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 ring-1 ring-zinc-800">
            {loopButtonLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  active,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`grid h-11 w-11 place-items-center rounded-xl ring-1 transition active:scale-[0.97] sm:h-12 sm:w-12 ${
        active
          ? "bg-violet-500/20 text-violet-100 ring-violet-400/50"
          : "bg-zinc-900 text-zinc-300 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}
