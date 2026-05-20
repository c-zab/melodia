import type WaveSurfer from "wavesurfer.js";

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

/** Seek to a position on the rehearsal timeline (seconds). */
export function seekToTime(rehearsalSeconds: number): void {
  useTimelineStore.getState().seekRehearsal(rehearsalSeconds);
}

export function skipSeconds(delta: number): void {
  useTimelineStore.getState().skipRehearsal(delta);
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}`;
}
