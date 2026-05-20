"use client";

import { Pause, Play, Plus, Repeat, X } from "lucide-react";

import {
  globalToBlockPosition,
  loopRegionInActiveBlock,
  rehearsalDuration,
} from "@/lib/rehearsal";
import { useTimelineStore } from "@/store/useTimelineStore";
import { formatTime, playPause, skipSeconds } from "@/lib/wavesurfer";

/** Rehearse the last N seconds up to the playhead (e.g. “that phrase again”). */
const LOOP_LENGTH_SECONDS = 10;

export default function PlaybackControls() {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const tracks = useTimelineStore((s) => s.project.tracks);
  const total = rehearsalDuration(tracks);
  const activeTrack = tracks[activeTrackIndex];
  const blockPos = globalToBlockPosition(tracks, activeTrackIndex, currentTime);
  const loopRegion = useTimelineStore((s) => s.project.loopRegion);
  const setLoopRegion = useTimelineStore((s) => s.setLoopRegion);
  const toggleLoopEnabled = useTimelineStore((s) => s.toggleLoopEnabled);
  const clearLoopRegion = useTimelineStore((s) => s.clearLoopRegion);
  const addMarker = useTimelineStore((s) => s.addMarker);

  const handleAddMarker = () => addMarker(currentTime, "action");

  const handleLoopButton = () => {
    if (!loopRegion) {
      if (total <= 0 || !activeTrack) return;
      const region = loopRegionInActiveBlock(
        tracks,
        activeTrackIndex,
        currentTime,
        LOOP_LENGTH_SECONDS,
      );
      if (!region) return;
      setLoopRegion(region.start, region.end);
      return;
    }
    toggleLoopEnabled();
  };

  const loopButtonLabel = !loopRegion
    ? `Loop last ${LOOP_LENGTH_SECONDS}s`
    : loopRegion.enabled
      ? "Looping"
      : "Loop off";

  return (
    <div className="sticky bottom-0 z-30 w-full border-t border-slate-800/80 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/85 sm:border-0 sm:bg-transparent">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <span className="min-w-0 truncate text-left">
            <span className="text-slate-200">
              {formatTime(blockPos.localInBlock)}
            </span>
            <span className="text-slate-600">
              {" "}
              / {formatTime(blockPos.blockDuration)}
            </span>
            {activeTrack ? (
              <span className="block truncate text-[10px] text-slate-500">
                {activeTrack.name}
              </span>
            ) : null}
          </span>
          {loopRegion ? (
            <span className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-200 ring-1 ring-cyan-400/30">
              Loop {formatTime(loopRegion.start)}–{formatTime(loopRegion.end)}
              <span className="text-cyan-300/60">
                ({formatTime(loopRegion.end - loopRegion.start)})
              </span>
              <button
                type="button"
                onClick={clearLoopRegion}
                aria-label="Clear loop"
                className="rounded-full p-0.5 text-cyan-200 hover:bg-cyan-500/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          <span className="shrink-0 text-right">
            <span className="text-slate-500">{formatTime(currentTime)}</span>
            <span className="text-slate-600"> / </span>
            <span>{formatTime(total)}</span>
            <span className="block text-[10px] text-slate-600">rehearsal</span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-center sm:gap-4">
          <ControlButton onClick={() => skipSeconds(-5)} aria-label="Back 5 seconds">
            <span className="text-xs font-semibold">-5s</span>
          </ControlButton>

          <button
            type="button"
            onClick={playPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-14 w-14 place-items-center rounded-full bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300 active:scale-[0.97] sm:h-16 sm:w-16"
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

          <div className="hidden h-8 w-px bg-slate-800 sm:block" />

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

        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 sm:hidden">
          <span className="rounded-full bg-slate-900 px-2 py-0.5 ring-1 ring-slate-800">
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
          ? "bg-violet-500/20 text-violet-100 ring-violet-400/50 shadow-sm shadow-violet-500/20"
          : "bg-slate-900/90 text-slate-300 ring-slate-700/80 hover:bg-slate-800 hover:text-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
