"use client";

import { Pause, Play, Plus, Repeat, X } from "lucide-react";

import { useLocale } from "@/hooks/useLocale";
import { loopRegionInDance } from "@/lib/dance";
import {
  getActiveMix,
  isCompositeMix,
  mixPlaybackDuration,
} from "@/lib/mix";
import { loopRegionInActiveBlock } from "@/lib/rehearsal";
import { useTimelineStore } from "@/store/useTimelineStore";
import { formatTime, playPause, skipSeconds } from "@/lib/wavesurfer";

const LOOP_LENGTH_SECONDS = 10;

export default function PlaybackControls() {
  const { t } = useLocale();
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const mixes = useTimelineStore((s) => s.mixes);
  const activeMixId = useTimelineStore((s) => s.activeMixId);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const mix = getActiveMix(mixes, activeMixId);
  const trackLoadBusy = useTimelineStore((s) => s.trackLoadBusy);
  const audioError = useTimelineStore((s) => s.audioError);
  const loopRegion = mix?.loopRegion;
  const setLoopRegion = useTimelineStore((s) => s.setLoopRegion);
  const toggleLoopEnabled = useTimelineStore((s) => s.toggleLoopEnabled);
  const clearLoopRegion = useTimelineStore((s) => s.clearLoopRegion);
  const addMarker = useTimelineStore((s) => s.addMarker);

  const duration = mix ? mixPlaybackDuration(mix) : 0;
  const mixIsReady = !trackLoadBusy && !audioError && duration > 0;
  const controlsDisabled = !mixIsReady;

  const handleAddMarker = () =>
    addMarker(currentTime, "note", t("marker.newMarker"));

  const handleLoopButton = () => {
    if (!loopRegion) {
      if (!mix || duration <= 0) return;
      const region = isCompositeMix(mix)
        ? loopRegionInActiveBlock(
            mix.tracks,
            activeTrackIndex,
            currentTime,
            LOOP_LENGTH_SECONDS,
          )
        : mix.tracks[0]
          ? loopRegionInDance(mix.tracks[0], currentTime, LOOP_LENGTH_SECONDS)
          : null;
      if (!region) return;
      setLoopRegion(region.start, region.end);
      return;
    }
    toggleLoopEnabled();
  };

  const loopButtonLabel = !loopRegion
    ? t("playback.loopLast", { seconds: LOOP_LENGTH_SECONDS })
    : loopRegion.enabled
      ? t("playback.looping")
      : t("playback.loopOff");

  return (
    <div className="sticky bottom-0 z-30 w-full border-t border-stone-800/80 bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/85 sm:border-0 sm:bg-transparent">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-2 text-xs font-mono text-stone-400">
          <span className="min-w-0 truncate text-left">
            {trackLoadBusy ? (
              <span className="text-[var(--accent-text)]">
                {t("playback.loadingMusic")}
              </span>
            ) : audioError ? (
              <span className="text-stone-500">{t("playback.musicNotReady")}</span>
            ) : (
              <>
                <span className="text-stone-200">{formatTime(currentTime)}</span>
                <span className="text-stone-600"> / {formatTime(duration)}</span>
              </>
            )}
            {mix ? (
              <span className="block truncate text-[10px] text-stone-500">
                {mix.name}
              </span>
            ) : null}
          </span>
          {loopRegion ? (
            <span className="flex items-center gap-2 rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-[11px] text-[var(--accent-text)] ring-1 ring-[var(--accent-ring)]">
              {t("playback.loopRange", {
                start: formatTime(loopRegion.start),
                end: formatTime(loopRegion.end),
              })}
              <span className="text-[var(--accent-text-muted)]">
                ({formatTime(loopRegion.end - loopRegion.start)})
              </span>
              <button
                type="button"
                onClick={clearLoopRegion}
                aria-label={t("playback.clearLoop")}
                className="rounded-full p-0.5 text-[var(--accent-text)] hover:bg-[var(--accent)]/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-center sm:gap-4">
          <ControlButton
            onClick={() => skipSeconds(-5)}
            aria-label={t("playback.back5")}
            disabled={controlsDisabled}
          >
            <span className="text-xs font-semibold">-5s</span>
          </ControlButton>

          <button
            type="button"
            onClick={playPause}
            disabled={controlsDisabled}
            aria-label={isPlaying ? t("playback.pause") : t("playback.play")}
            className="grid h-14 w-14 place-items-center rounded-full text-stone-950 shadow-lg transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 sm:h-16 sm:w-16"
            style={{
              background: "var(--accent)",
              boxShadow: "0 8px 24px rgba(212, 38, 48, 0.4)",
            }}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-0.5 h-6 w-6" />
            )}
          </button>

          <ControlButton
            onClick={() => skipSeconds(5)}
            aria-label={t("playback.forward5")}
            disabled={controlsDisabled}
          >
            <span className="text-xs font-semibold">+5s</span>
          </ControlButton>

          <div className="hidden h-8 w-px bg-stone-800 sm:block" />

          <ControlButton
            onClick={handleAddMarker}
            aria-label={t("playback.addMarker")}
            disabled={controlsDisabled}
          >
            <Plus className="h-5 w-5" />
          </ControlButton>

          <div className="hidden h-8 w-px bg-stone-800 sm:block" />

          <ControlButton
            onClick={handleLoopButton}
            aria-label={loopButtonLabel}
            active={Boolean(loopRegion?.enabled)}
            disabled={controlsDisabled}
          >
            <Repeat className="h-5 w-5" />
          </ControlButton>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-stone-500 sm:hidden">
          <span className="rounded-full bg-stone-900 px-2 py-0.5 ring-1 ring-stone-800">
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
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`grid h-11 w-11 place-items-center rounded-xl ring-1 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 sm:w-12 ${
        active
          ? "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent-ring)] shadow-sm shadow-black/25"
          : "bg-stone-900/90 text-stone-300 ring-stone-700/80 hover:bg-stone-800 hover:text-stone-50"
      }`}
    >
      {children}
    </button>
  );
}
