import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { nanoid } from "nanoid";

import { danceLocalToFile, danceSegmentLength } from "@/lib/dance";
import {
  type DanceCategoryId,
  inferDanceCategory,
} from "@/lib/dances";
import {
  getActiveMix,
  isCompositeMix,
  mixPlaybackDuration,
  type LoopRegion,
  type Marker,
  type Mix,
  type MixKind,
} from "@/lib/mix";
import { normalizeMarkerType, type MarkerType } from "@/lib/markers";
import {
  type RehearsalStep,
  type TrackSegment,
  clamp,
  globalTimeToTrackFile,
  rehearsalDuration,
  resolveStepIdAtTime,
  segmentGlobalOffsets,
} from "@/lib/rehearsal";

export type { DanceCategoryId } from "@/lib/dances";
export { categoryLabel } from "@/lib/dances";
export type { LoopRegion, Marker, MarkerType, Mix, MixKind } from "@/lib/mix";
export { getActiveMix, isCompositeMix, mixPlaybackDuration } from "@/lib/mix";
export type { RehearsalStep } from "@/lib/rehearsal";
export type Track = TrackSegment;

type TimelineState = {
  mixes: Mix[];
  activeMixId: string;
  /** Index into the active mix’s `tracks` (composite only; 0 for single). */
  activeTrackIndex: number;
  currentTime: number;
  isPlaying: boolean;
  audioError: string | null;
  trackLoadBusy: boolean;
  pendingFileSeek: number | null;

  selectedMarkerId: string | null;
  isMarkerModalOpen: boolean;

  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setAudioError: (error: string | null) => void;
  setTrackLoadBusy: (busy: boolean) => void;
  clearPendingFileSeek: () => void;

  setActiveMix: (mixId: string) => void;
  jumpToTrack: (trackIndex: number) => void;
  seekPlayback: (seconds: number) => void;
  skipPlayback: (deltaSeconds: number) => void;

  addMarker: (time: number, type?: MarkerType, title?: string) => string;
  updateMarker: (id: string, patch: Partial<Omit<Marker, "id">>) => void;
  deleteMarker: (id: string) => void;

  setLoopRegion: (start: number, end: number) => void;
  toggleLoopEnabled: () => void;
  clearLoopRegion: () => void;

  openMarkerModal: (id: string | null) => void;
  closeMarkerModal: () => void;

  fileDuration: number;
  setFileDuration: (seconds: number) => void;

  /** Expand the active single-track mix window to full decoded file (Caporales). */
  setActiveTrackWindow: (segmentStart: number, segmentEnd: number) => void;
};

const morenadaSteps: RehearsalStep[] = [
  { id: "step-basico-a", title: "Paso básico", startTime: 0 },
  { id: "step-1", title: "Paso 1", startTime: 8 },
  { id: "step-2", title: "Paso 2", startTime: 20 },
  { id: "step-basico-b", title: "Paso básico", startTime: 36 },
  { id: "step-3", title: "Paso 3", startTime: 48 },
  { id: "step-final", title: "Paso final / transición", startTime: 100 },
];

const morenadaMarkersBase = [
  {
    id: nanoid(8),
    time: 4,
    type: "note" as const,
    title: "Levantar sombreros",
    note: "Todos a la vez, mirando al frente.",
  },
  {
    id: nanoid(8),
    time: 12,
    type: "note" as const,
    title: "Entrada parejas",
    note: "Pareja A entra desde la izquierda.",
  },
  {
    id: nanoid(8),
    time: 24,
    type: "cue" as const,
    title: "Cambio de formación",
    note: "Diagonal hacia el centro del escenario.",
  },
  {
    id: nanoid(8),
    time: 40,
    type: "note" as const,
    title: "Bajar manos",
    note: "Movimiento suave, contar 4 tiempos.",
  },
  {
    id: nanoid(8),
    time: 56,
    type: "cue" as const,
    title: "Ir a esquinas",
    note: "Cuatro grupos a las cuatro esquinas.",
  },
];

const morenadaMarkers: Marker[] = morenadaMarkersBase.map((m) => ({
  ...m,
  stepId: resolveStepIdAtTime(morenadaSteps, m.time),
  cueEndTime: null,
}));

/** Song 1: 0:00–2:09 · Song 2: 1:00–2:11 · Song 3: 0:50–3:00 */
const morenadaTracks: TrackSegment[] = [
  {
    id: "track-1",
    name: "Song 1",
    src: "/audio/song-1.mp3",
    segmentStart: 0,
    segmentEnd: 2 * 60 + 9,
  },
  {
    id: "track-2",
    name: "Song 2",
    src: "/audio/song-2.mp3",
    segmentStart: 1 * 60,
    segmentEnd: 2 * 60 + 11,
  },
  {
    id: "track-3",
    name: "Song 3",
    src: "/audio/song-3.mp3",
    segmentStart: 50,
    segmentEnd: 3 * 60,
  },
];

export const initialMixes: Mix[] = [
  {
    id: "mix-morenada",
    category: "morenada",
    name: "Morenada",
    kind: "composite",
    tracks: morenadaTracks,
    markers: morenadaMarkers,
    steps: morenadaSteps,
    playbackTime: 0,
  },
  {
    id: "mix-caporales",
    category: "caporales",
    name: "Caporales",
    kind: "single",
    tracks: [
      {
        id: "track-caporales",
        name: "Caporales",
        src: "/audio/caporales-julia.mp3",
        segmentStart: 0,
        segmentEnd: 216,
      },
    ],
    markers: [],
    steps: [],
    playbackTime: 0,
  },
];

const sortByTime = (markers: Marker[]) =>
  [...markers].sort((a, b) => a.time - b.time);

const STORAGE_KEY = "melodia.timeline.v6";

function mergeTracksFromStorage(
  raw: unknown,
  fallback: TrackSegment[],
): TrackSegment[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return raw.map((item, i) => {
    const t = item as Partial<TrackSegment>;
    const f = fallback[i];
    const segmentStart =
      typeof t.segmentStart === "number" && Number.isFinite(t.segmentStart)
        ? Math.max(0, t.segmentStart)
        : (f?.segmentStart ?? 0);
    let segmentEnd =
      typeof t.segmentEnd === "number" && Number.isFinite(t.segmentEnd)
        ? t.segmentEnd
        : (f?.segmentEnd ?? segmentStart + 60);
    segmentEnd = Math.max(segmentStart + 0.25, segmentEnd);
    return {
      id: typeof t.id === "string" && t.id ? t.id : (f?.id ?? `track-${i}`),
      name:
        typeof t.name === "string" && t.name.trim()
          ? t.name.trim()
          : (f?.name ?? `Song ${i + 1}`),
      src:
        typeof t.src === "string" && t.src
          ? t.src
          : (f?.src ?? "/audio/song-1.mp3"),
      segmentStart,
      segmentEnd,
    };
  });
}

function mergeStepsFromStorage(
  raw: unknown,
  fallback: RehearsalStep[],
): RehearsalStep[] {
  if (!Array.isArray(raw)) return [...fallback];
  if (raw.length === 0) return [];
  return raw.map((item, i) => {
    const s = item as Partial<RehearsalStep>;
    const f = fallback[i];
    return {
      id: typeof s.id === "string" && s.id ? s.id : (f?.id ?? `step-${i}`),
      title:
        typeof s.title === "string" && s.title.trim()
          ? s.title.trim()
          : (f?.title ?? `Step ${i + 1}`),
      startTime:
        typeof s.startTime === "number" && Number.isFinite(s.startTime)
          ? s.startTime
          : (f?.startTime ?? 0),
    };
  });
}

function mergeMarkersFromStorage(raw: unknown, steps: RehearsalStep[]): Marker[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const m = item as Partial<Marker>;
    const typ = normalizeMarkerType(m.type);
    const time =
      typeof m.time === "number" && Number.isFinite(m.time) ? Math.max(0, m.time) : 0;
    const stepIdFromDisk =
      typeof m.stepId === "string"
        ? m.stepId
        : m.stepId === null
          ? null
          : undefined;
    return {
      id: typeof m.id === "string" && m.id ? m.id : nanoid(8),
      time,
      type: typ,
      title: typeof m.title === "string" ? m.title : "Marker",
      note: typeof m.note === "string" ? m.note : "",
      stepId:
        stepIdFromDisk !== undefined
          ? stepIdFromDisk
          : resolveStepIdAtTime(steps, time),
      cueEndTime:
        typeof m.cueEndTime === "number" &&
        Number.isFinite(m.cueEndTime) &&
        m.cueEndTime > time + 0.05
          ? m.cueEndTime
          : null,
    };
  });
}

function mergeMixItem(
  item: Partial<Mix>,
  fallbackById: Map<string, Mix>,
  index: number,
): Mix {
  const id =
    typeof item.id === "string" && item.id ? item.id : `mix-${index}`;
  const f = fallbackById.get(id) ?? initialMixes[index] ?? initialMixes[0];
  const kind: MixKind =
    item.kind === "single" || item.kind === "composite"
      ? item.kind
      : (f?.kind ?? "single");
  const tracks = mergeTracksFromStorage(item.tracks, f?.tracks ?? []);
  const steps = mergeStepsFromStorage(item.steps, f?.steps ?? []);
  let markers = mergeMarkersFromStorage(item.markers, steps);
  markers = markers.map((m) => ({
    ...m,
    stepId:
      m.stepId != null && steps.some((s) => s.id === m.stepId)
        ? m.stepId
        : resolveStepIdAtTime(steps, m.time),
  }));
  let loopRegion: LoopRegion | undefined;
  if (
    item.loopRegion &&
    typeof item.loopRegion.start === "number" &&
    typeof item.loopRegion.end === "number" &&
    Number.isFinite(item.loopRegion.start) &&
    Number.isFinite(item.loopRegion.end)
  ) {
    loopRegion = {
      start: Math.max(0, item.loopRegion.start),
      end: Math.max(item.loopRegion.start + 0.1, item.loopRegion.end),
      enabled: Boolean(item.loopRegion.enabled),
    };
  } else if (f?.loopRegion) {
    loopRegion = f.loopRegion;
  }
  const len = mixPlaybackDuration({
    ...f,
    id,
    kind,
    tracks,
    markers,
    steps,
  });
  if (loopRegion) {
    loopRegion.start = clamp(loopRegion.start, 0, len);
    loopRegion.end = clamp(loopRegion.end, loopRegion.start + 0.1, len);
  }
  const playbackTime =
    typeof item.playbackTime === "number" && Number.isFinite(item.playbackTime)
      ? clamp(item.playbackTime, 0, len)
      : (f?.playbackTime ?? 0);
  const category = inferDanceCategory({
    id,
    category: item.category ?? f?.category,
  });
  return {
    id,
    category,
    name:
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : (f?.name ?? "Mix"),
    kind,
    tracks,
    markers,
    steps,
    loopRegion,
    playbackTime,
  };
}

function mergeMixesFromStorage(raw: unknown, fallback: Mix[]): Mix[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const fallbackById = new Map(fallback.map((m) => [m.id, m]));
  const merged = raw.map((item, i) =>
    mergeMixItem(item as Partial<Mix>, fallbackById, i),
  );
  const knownIds = new Set(merged.map((m) => m.id));
  for (const mix of fallback) {
    if (!knownIds.has(mix.id)) {
      merged.push(mix);
      knownIds.add(mix.id);
    }
  }
  return merged;
}

function migrateLegacyDances(raw: unknown): Mix[] | null {
  if (!Array.isArray(raw)) return null;
  const morenada = raw.find(
    (d) =>
      (d as { id?: string }).id?.includes("morenada") &&
      Array.isArray((d as { markers?: unknown }).markers) &&
      ((d as { markers?: unknown[] }).markers?.length ?? 0) > 0,
  ) as Partial<Mix> | undefined;
  const cap = raw.find((d) =>
    (d as { id?: string }).id?.includes("caporales"),
  ) as Partial<Mix> | undefined;
  return [
    mergeMixItem(
      {
        ...initialMixes[0],
        markers: morenada?.markers ?? initialMixes[0].markers,
        steps: morenada?.steps ?? initialMixes[0].steps,
        playbackTime:
          typeof morenada?.playbackTime === "number"
            ? morenada.playbackTime
            : 0,
      },
      new Map(initialMixes.map((m) => [m.id, m])),
      0,
    ),
    mergeMixItem(
      {
        ...initialMixes[1],
        markers: cap?.markers ?? [],
        playbackTime:
          typeof cap?.playbackTime === "number" ? cap.playbackTime : 0,
      },
      new Map(initialMixes.map((m) => [m.id, m])),
      1,
    ),
  ];
}

function migrateLegacyProject(raw: unknown): Mix[] | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as {
    tracks?: unknown;
    markers?: unknown;
    steps?: unknown;
    loopRegion?: LoopRegion;
  };
  if (!Array.isArray(p.tracks)) return null;
  return [
    mergeMixItem(
      {
        ...initialMixes[0],
        tracks: mergeTracksFromStorage(p.tracks, initialMixes[0].tracks),
        markers: mergeMarkersFromStorage(
          p.markers,
          mergeStepsFromStorage(p.steps, initialMixes[0].steps),
        ),
        steps: mergeStepsFromStorage(p.steps, initialMixes[0].steps),
        loopRegion: p.loopRegion,
      },
      new Map(initialMixes.map((m) => [m.id, m])),
      0,
    ),
    initialMixes[1],
  ];
}

function mergePersistedTimeline(
  persistedState: unknown,
  currentState: TimelineState,
): TimelineState {
  const p = persistedState as
    | Partial<
        Pick<
          TimelineState,
          "mixes" | "activeMixId" | "currentTime" | "activeTrackIndex"
        >
      > & {
        dances?: unknown;
        activeDanceId?: string;
        project?: unknown;
      }
    | undefined;
  if (!p) return currentState;

  let mixes = initialMixes;
  if (p.mixes) {
    mixes = mergeMixesFromStorage(p.mixes, initialMixes);
  } else if (p.dances) {
    const migrated = migrateLegacyDances(p.dances);
    if (migrated) mixes = migrated;
  } else if (p.project) {
    const migrated = migrateLegacyProject(p.project);
    if (migrated) mixes = migrated;
  }

  const activeMixId =
    typeof p.activeMixId === "string" &&
    mixes.some((m) => m.id === p.activeMixId)
      ? p.activeMixId
      : typeof p.activeDanceId === "string" && p.activeDanceId.includes("caporales")
        ? "mix-caporales"
        : mixes[0]?.id ?? "";

  const mix = getActiveMix(mixes, activeMixId);
  const total = mix ? mixPlaybackDuration(mix) : 0;
  let currentTime = clamp(
    typeof p.currentTime === "number" && Number.isFinite(p.currentTime)
      ? p.currentTime
      : (mix?.playbackTime ?? 0),
    0,
    Math.max(0, total - 1e-6),
  );

  let activeTrackIndex = 0;
  let pendingFileSeek: number | null = null;

  if (mix && isCompositeMix(mix)) {
    const { trackIndex, fileTime } = globalTimeToTrackFile(mix.tracks, currentTime);
    activeTrackIndex = trackIndex;
    pendingFileSeek = fileTime;
  } else if (mix?.tracks[0]) {
    const tr = mix.tracks[0];
    currentTime = clamp(currentTime, 0, danceSegmentLength(tr));
    pendingFileSeek = danceLocalToFile(tr, currentTime);
  }

  return {
    ...currentState,
    mixes,
    activeMixId,
    activeTrackIndex,
    currentTime,
    pendingFileSeek,
    selectedMarkerId: null,
    isMarkerModalOpen: false,
  };
}

function noopStorage(): Storage {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    get length() {
      return 0;
    },
    key: () => null,
  } as Storage;
}

function persistPlaybackOnMix(
  mixes: Mix[],
  mixId: string,
  playbackTime: number,
): Mix[] {
  return mixes.map((m) => (m.id === mixId ? { ...m, playbackTime } : m));
}

function updateActiveMix(
  mixes: Mix[],
  activeMixId: string,
  patch: Partial<Mix>,
): Mix[] {
  return mixes.map((m) => (m.id === activeMixId ? { ...m, ...patch } : m));
}

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      mixes: initialMixes,
      activeMixId: initialMixes[0]?.id ?? "",
      activeTrackIndex: 0,
      currentTime: 0,
      isPlaying: false,
      audioError: null,
      trackLoadBusy: true,
      pendingFileSeek: null,
      selectedMarkerId: null,
      isMarkerModalOpen: false,

      fileDuration: 0,

      setCurrentTime: (time) => set({ currentTime: time }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setAudioError: (error) => set({ audioError: error }),
      setTrackLoadBusy: (busy) => set({ trackLoadBusy: busy }),
      clearPendingFileSeek: () => set({ pendingFileSeek: null }),

      setActiveMix: (mixId) => {
        const { mixes, activeMixId, currentTime } = get();
        const target = mixes.find((m) => m.id === mixId);
        if (!target || mixId === activeMixId) return;

        const withSaved = persistPlaybackOnMix(mixes, activeMixId, currentTime);
        const len = mixPlaybackDuration(target);
        const local = clamp(target.playbackTime, 0, Math.max(0, len - 1e-6));

        if (isCompositeMix(target)) {
          const { trackIndex, fileTime } = globalTimeToTrackFile(
            target.tracks,
            local,
          );
          set({
            mixes: withSaved,
            activeMixId: mixId,
            activeTrackIndex: trackIndex,
            currentTime: local,
            pendingFileSeek: fileTime,
            selectedMarkerId: null,
            isMarkerModalOpen: false,
            audioError: null,
            trackLoadBusy: true,
            isPlaying: false,
          });
          return;
        }

        const tr = target.tracks[0];
        set({
          mixes: withSaved,
          activeMixId: mixId,
          activeTrackIndex: 0,
          currentTime: local,
          pendingFileSeek: tr ? danceLocalToFile(tr, local) : null,
          selectedMarkerId: null,
          isMarkerModalOpen: false,
          audioError: null,
          trackLoadBusy: true,
          isPlaying: false,
        });
      },

      jumpToTrack: (trackIndex) => {
        const { mixes, activeMixId } = get();
        const mix = getActiveMix(mixes, activeMixId);
        if (!mix || !isCompositeMix(mix)) return;
        const tracks = mix.tracks;
        if (tracks.length === 0) return;
        const i = clamp(trackIndex, 0, tracks.length - 1);
        const offsets = segmentGlobalOffsets(tracks);
        const tr = tracks[i];
        set({
          activeTrackIndex: i,
          currentTime: offsets[i],
          pendingFileSeek: tr.segmentStart,
        });
      },

      seekPlayback: (seconds) => {
        const { mixes, activeMixId } = get();
        const mix = getActiveMix(mixes, activeMixId);
        if (!mix) return;

        if (isCompositeMix(mix)) {
          const total = rehearsalDuration(mix.tracks);
          const g = clamp(seconds, 0, Math.max(0, total - 1e-6));
          const { trackIndex, fileTime } = globalTimeToTrackFile(mix.tracks, g);
          set({
            currentTime: g,
            activeTrackIndex: trackIndex,
            pendingFileSeek: fileTime,
          });
          return;
        }

        const tr = mix.tracks[0];
        if (!tr) return;
        const len = danceSegmentLength(tr);
        const local = clamp(seconds, 0, Math.max(0, len - 1e-6));
        set({
          currentTime: local,
          activeTrackIndex: 0,
          pendingFileSeek: danceLocalToFile(tr, local),
        });
      },

      skipPlayback: (deltaSeconds) => {
        const { currentTime } = get();
        get().seekPlayback(currentTime + deltaSeconds);
      },

      addMarker: (time, type = "note", title = "New marker") => {
        const id = nanoid(8);
        set((state) => {
          const mix = getActiveMix(state.mixes, state.activeMixId);
          if (!mix) return state;
          const len = mixPlaybackDuration(mix);
          const t = clamp(time, 0, Math.max(0, len - 1e-6));
          const stepId = resolveStepIdAtTime(mix.steps, t);
          const mixes = updateActiveMix(state.mixes, mix.id, {
            markers: sortByTime([
              ...mix.markers,
              {
                id,
                time: t,
                type,
                title,
                note: "",
                stepId,
                cueEndTime: null,
              },
            ]),
          });
          return {
            mixes,
            selectedMarkerId: id,
            isMarkerModalOpen: true,
          };
        });
        return id;
      },

      updateMarker: (id, patch) =>
        set((state) => ({
          mixes: state.mixes.map((m) =>
            m.markers.some((mk) => mk.id === id)
              ? {
                  ...m,
                  markers: sortByTime(
                    m.markers.map((mk) =>
                      mk.id === id ? { ...mk, ...patch } : mk,
                    ),
                  ),
                }
              : m,
          ),
        })),

      deleteMarker: (id) =>
        set((state) => ({
          mixes: state.mixes.map((m) =>
            m.markers.some((mk) => mk.id === id)
              ? { ...m, markers: m.markers.filter((mk) => mk.id !== id) }
              : m,
          ),
          selectedMarkerId: null,
          isMarkerModalOpen: false,
        })),

      setLoopRegion: (start, end) =>
        set((state) => {
          const mix = getActiveMix(state.mixes, state.activeMixId);
          if (!mix) return state;
          const len = mixPlaybackDuration(mix);
          const safeStart = clamp(Math.min(start, end), 0, len);
          const safeEnd = clamp(Math.max(start, end), safeStart + 0.1, len);
          return {
            mixes: updateActiveMix(state.mixes, mix.id, {
              loopRegion: {
                start: safeStart,
                end: safeEnd,
                enabled: mix.loopRegion?.enabled ?? true,
              },
            }),
          };
        }),

      toggleLoopEnabled: () =>
        set((state) => {
          const mix = getActiveMix(state.mixes, state.activeMixId);
          if (!mix?.loopRegion) return state;
          return {
            mixes: updateActiveMix(state.mixes, mix.id, {
              loopRegion: {
                ...mix.loopRegion,
                enabled: !mix.loopRegion.enabled,
              },
            }),
          };
        }),

      clearLoopRegion: () =>
        set((state) => {
          const mix = getActiveMix(state.mixes, state.activeMixId);
          if (!mix) return state;
          return {
            mixes: updateActiveMix(state.mixes, mix.id, { loopRegion: undefined }),
          };
        }),

      openMarkerModal: (id) =>
        set({ selectedMarkerId: id, isMarkerModalOpen: true }),
      closeMarkerModal: () => set({ isMarkerModalOpen: false }),

      setFileDuration: (seconds) =>
        set({
          fileDuration: Number.isFinite(seconds) ? Math.max(0, seconds) : 0,
        }),

      setActiveTrackWindow: (segmentStart, segmentEnd) =>
        set((state) => {
          const mix = getActiveMix(state.mixes, state.activeMixId);
          if (!mix || mix.kind !== "single" || !mix.tracks[0]) return state;
          const a = Math.max(0, segmentStart);
          const b = Math.max(a + 0.25, segmentEnd);
          const tr = { ...mix.tracks[0], segmentStart: a, segmentEnd: b };
          const len = danceSegmentLength(tr);
          const newCurrent = clamp(state.currentTime, 0, Math.max(0, len - 1e-6));
          const tracks = [tr, ...mix.tracks.slice(1)];
          const mixes = updateActiveMix(state.mixes, mix.id, { tracks });
          return {
            mixes,
            currentTime: newCurrent,
            pendingFileSeek: danceLocalToFile(tr, newCurrent),
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage() : localStorage,
      ),
      partialize: (s) => {
        const { mixes, activeMixId, currentTime } = s;
        const withPlayback = persistPlaybackOnMix(mixes, activeMixId, currentTime);
        return {
          mixes: withPlayback,
          activeMixId,
          currentTime,
        };
      },
      merge: (persistedState, currentState) =>
        mergePersistedTimeline(persistedState, currentState),
    },
  ),
);

/** @deprecated Use getActiveMix */
export const getActiveDance = getActiveMix;
