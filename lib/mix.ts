import { danceSegmentLength } from "@/lib/dance";
import type { DanceCategoryId } from "@/lib/dances";
import type { MarkerType } from "@/lib/markers";
import {
  rehearsalDuration,
  type RehearsalStep,
  type TrackSegment,
} from "@/lib/rehearsal";

export type { MarkerType } from "@/lib/markers";

export type MixKind = "single" | "composite";

export type Marker = {
  id: string;
  time: number;
  type: MarkerType;
  title: string;
  note: string;
  stepId: string | null;
  cueEndTime: number | null;
};

export type LoopRegion = {
  start: number;
  end: number;
  enabled: boolean;
};

export type Mix = {
  id: string;
  category: DanceCategoryId;
  name: string;
  kind: MixKind;
  tracks: TrackSegment[];
  markers: Marker[];
  steps: RehearsalStep[];
  loopRegion?: LoopRegion;
  playbackTime: number;
};

export function isCompositeMix(mix: Mix): boolean {
  return mix.kind === "composite" && mix.tracks.length > 1;
}

export function mixPlaybackDuration(mix: Mix): number {
  if (isCompositeMix(mix)) return rehearsalDuration(mix.tracks);
  const tr = mix.tracks[0];
  return tr ? danceSegmentLength(tr) : 0;
}

export function getActiveMix(
  mixes: Mix[],
  activeMixId: string,
): Mix | undefined {
  return mixes.find((m) => m.id === activeMixId) ?? mixes[0];
}

export function activeTrack(
  mix: Mix,
  activeTrackIndex: number,
): TrackSegment | undefined {
  return mix.tracks[activeTrackIndex] ?? mix.tracks[0];
}
