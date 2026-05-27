import type WaveSurfer from "wavesurfer.js";

import { MARKER_CUE_LEAD_SECONDS } from "@/lib/markers";
import { useTimelineStore } from "@/store/useTimelineStore";

let wsInstance: WaveSurfer | null = null;

export function setWaveSurferInstance(ws: WaveSurfer | null): void {
  wsInstance = ws;
}

export function getWaveSurferInstance(): WaveSurfer | null {
  return wsInstance;
}

export function playPause(): void {
  void wsInstance?.playPause();
}

/** Seek on the active mix timeline (global for Morenada, local for Caporales). */
export function seekToTime(seconds: number): void {
  useTimelineStore.getState().seekPlayback(seconds);
}

/** Jump to a cue with rehearsal lead-in (default 3s before the marker). */
export function seekToMarkerCue(markerTime: number): void {
  seekToTime(Math.max(0, markerTime - MARKER_CUE_LEAD_SECONDS));
}

export function skipSeconds(delta: number): void {
  useTimelineStore.getState().skipPlayback(delta);
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}`;
}
