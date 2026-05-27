import { clamp } from "@/lib/rehearsal";

export type DanceSegment = {
  id: string;
  name: string;
  src: string;
  segmentStart: number;
  segmentEnd: number;
};

export function danceSegmentLength(d: DanceSegment): number {
  return Math.max(0.1, d.segmentEnd - d.segmentStart);
}

export function danceLocalToFile(d: DanceSegment, localSeconds: number): number {
  const len = danceSegmentLength(d);
  const local = clamp(localSeconds, 0, len);
  return d.segmentStart + local;
}

export function danceFileToLocal(d: DanceSegment, fileSeconds: number): number {
  const len = danceSegmentLength(d);
  const local = clamp(fileSeconds, d.segmentStart, d.segmentEnd) - d.segmentStart;
  return clamp(local, 0, len);
}

/** Loop the last N seconds up to the playhead within this dance’s window. */
export function loopRegionInDance(
  d: DanceSegment,
  localPlayhead: number,
  windowSeconds: number,
): { start: number; end: number } | null {
  const len = danceSegmentLength(d);
  let end = clamp(localPlayhead, 0, len);
  let start = Math.max(0, end - windowSeconds);
  if (end - start < 0.1) {
    start = 0;
    end = Math.min(len, windowSeconds);
  }
  return { start, end };
}

export function loopRegionToFile(
  d: DanceSegment,
  localStart: number,
  localEnd: number,
): { start: number; end: number } | null {
  const len = danceSegmentLength(d);
  const L0 = Math.min(localStart, localEnd);
  const L1 = Math.max(localStart, localEnd);
  const seg0 = clamp(L0, 0, len);
  const seg1 = clamp(L1, 0, len);
  if (seg1 - seg0 < 0.12) return null;
  return {
    start: danceLocalToFile(d, seg0),
    end: danceLocalToFile(d, seg1),
  };
}
