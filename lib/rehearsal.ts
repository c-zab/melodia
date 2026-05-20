export type TrackSegment = {
  id: string;
  name: string;
  src: string;
  /** In-point within the audio file (seconds) */
  segmentStart: number;
  /** Out-point within the audio file (seconds) */
  segmentEnd: number;
};

export function segmentLength(t: TrackSegment): number {
  return Math.max(0.1, t.segmentEnd - t.segmentStart);
}

export function rehearsalDuration(tracks: TrackSegment[]): number {
  return tracks.reduce((sum, tr) => sum + segmentLength(tr), 0);
}

/** Global rehearsal time where each track segment starts (same order as `tracks`). */
export function segmentGlobalOffsets(tracks: TrackSegment[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const tr of tracks) {
    out.push(acc);
    acc += segmentLength(tr);
  }
  return out;
}

/** Map a global loop window to file-time bounds for the active track, or null if no overlap. */
export function globalLoopToFileRegion(
  tracks: TrackSegment[],
  activeIndex: number,
  loopStart: number,
  loopEnd: number,
): { start: number; end: number } | null {
  if (activeIndex < 0 || activeIndex >= tracks.length) return null;
  const offsets = segmentGlobalOffsets(tracks);
  const tr = tracks[activeIndex];
  const len = segmentLength(tr);
  const g0 = offsets[activeIndex];
  const g1 = g0 + len;
  const L0 = Math.min(loopStart, loopEnd);
  const L1 = Math.max(loopStart, loopEnd);
  const seg0 = Math.max(L0, g0);
  const seg1 = Math.min(L1, g1);
  if (seg1 - seg0 < 0.12) return null;
  return {
    start: tr.segmentStart + (seg0 - g0),
    end: tr.segmentStart + (seg1 - g0),
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Map a global rehearsal clock (0 … total) to which file is playing and local file time.
 */
export function globalTimeToTrackFile(
  tracks: TrackSegment[],
  globalSeconds: number,
): { trackIndex: number; fileTime: number } {
  if (tracks.length === 0) return { trackIndex: 0, fileTime: 0 };
  const total = rehearsalDuration(tracks);
  let g = clamp(globalSeconds, 0, Math.max(0, total - 1e-6));
  for (let i = 0; i < tracks.length; i++) {
    const len = segmentLength(tracks[i]);
    const tr = tracks[i];
    const isLast = i === tracks.length - 1;
    if (isLast) {
      const within = clamp(g, 0, len);
      return {
        trackIndex: i,
        fileTime: clamp(tr.segmentStart + within, tr.segmentStart, tr.segmentEnd),
      };
    }
    // Half-open segments so global time exactly at the next block’s start maps to that track (e.g. click Song 2).
    if (g < len) {
      const within = clamp(g, 0, len);
      return {
        trackIndex: i,
        fileTime: clamp(tr.segmentStart + within, tr.segmentStart, tr.segmentEnd),
      };
    }
    g -= len;
  }
  const li = tracks.length - 1;
  const lt = tracks[li];
  return {
    trackIndex: li,
    fileTime: clamp(lt.segmentEnd - 0.05, lt.segmentStart, lt.segmentEnd),
  };
}

/** Local file time → global rehearsal time (clamped to this track’s segment window). */
export function trackFileToGlobal(
  tracks: TrackSegment[],
  trackIndex: number,
  fileTime: number,
): number {
  if (trackIndex < 0 || trackIndex >= tracks.length) return 0;
  const offsets = segmentGlobalOffsets(tracks);
  const tr = tracks[trackIndex];
  const local = clamp(fileTime, tr.segmentStart, tr.segmentEnd) - tr.segmentStart;
  return offsets[trackIndex] + local;
}

/** If a global marker time falls inside this track's rehearsal block, return file seconds; else null. */
export function markerGlobalToFileInTrack(
  tracks: TrackSegment[],
  activeIndex: number,
  markerGlobal: number,
): number | null {
  if (activeIndex < 0 || activeIndex >= tracks.length) return null;
  const offsets = segmentGlobalOffsets(tracks);
  const off = offsets[activeIndex];
  const tr = tracks[activeIndex];
  const len = segmentLength(tr);
  if (markerGlobal < off || markerGlobal >= off + len) return null;
  return tr.segmentStart + (markerGlobal - off);
}

/** Rehearsal “step” (e.g. Paso 1) — global cue grouping, not tied to audio files. */
export type RehearsalStep = {
  id: string;
  title: string;
  /** Global rehearsal second where this step begins (inclusive). */
  startTime: number;
};

/** Pick the active step id for a global rehearsal time (last step with startTime ≤ t). */
export function resolveStepIdAtTime(
  steps: RehearsalStep[],
  globalSeconds: number,
): string | null {
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.startTime - b.startTime);
  let id: string | null = null;
  for (const s of sorted) {
    if (globalSeconds + 1e-9 >= s.startTime) id = s.id;
  }
  return id;
}

/** Seconds from this step’s global start to the marker (0-based within the step), or null. */
export function markerOffsetInStep(
  steps: RehearsalStep[],
  marker: { stepId: string | null; time: number },
): number | null {
  if (!marker.stepId || steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.startTime - b.startTime);
  const st = sorted.find((s) => s.id === marker.stepId);
  if (!st) return null;
  return Math.max(0, marker.time - st.startTime);
}
