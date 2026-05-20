import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { nanoid } from "nanoid";

import {
  type TrackSegment,
  type RehearsalStep,
  clamp,
  globalTimeToTrackFile,
  rehearsalDuration,
  resolveStepIdAtTime,
  segmentGlobalOffsets,
} from "@/lib/rehearsal";

export type { RehearsalStep } from "@/lib/rehearsal";

export type MarkerType = "comment" | "action" | "cue";

export type Marker = {
  id: string;
  /** Seconds on the full rehearsal timeline (sum of segment lengths) */
  time: number;
  type: MarkerType;
  title: string;
  note: string;
  /** Rehearsal step this cue belongs to (see `project.steps`). */
  stepId: string | null;
  /**
   * Optional global end time for this cue (rehearsal seconds).
   * When set after `time`, playback can treat the row as an active “window”.
   */
  cueEndTime: number | null;
};

export type LoopRegion = {
  start: number;
  end: number;
  enabled: boolean;
};

export type Track = TrackSegment;

export type Project = {
  title: string;
  tracks: Track[];
  /** Ordered rehearsal steps (paso 1, paso 2, …); markers reference `stepId`. */
  steps: RehearsalStep[];
  markers: Marker[];
  loopRegion?: LoopRegion;
};

type TimelineState = {
  project: Project;
  /** Global rehearsal clock (seconds from start of segment 1 through all segments) */
  currentTime: number;
  isPlaying: boolean;
  audioError: string | null;
  /** True while WaveSurfer is loading another MP3 after a track change. */
  trackLoadBusy: boolean;

  activeTrackIndex: number;
  /** WaveformPlayer applies this after load/ready */
  pendingFileSeek: number | null;

  selectedMarkerId: string | null;
  isMarkerModalOpen: boolean;

  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setAudioError: (error: string | null) => void;
  setTrackLoadBusy: (busy: boolean) => void;

  setActiveTrackIndex: (index: number) => void;
  clearPendingFileSeek: () => void;
  /** Seek the rehearsal timeline; updates active track + pending file seek */
  seekRehearsal: (globalSeconds: number) => void;
  /** Jump to the start of a block (explicit track pick from the UI). */
  jumpToTrack: (trackIndex: number) => void;
  skipRehearsal: (deltaSeconds: number) => void;

  addMarker: (globalTime: number, type?: MarkerType) => string;
  updateMarker: (id: string, patch: Partial<Omit<Marker, "id">>) => void;
  deleteMarker: (id: string) => void;

  setLoopRegion: (start: number, end: number) => void;
  toggleLoopEnabled: () => void;
  clearLoopRegion: () => void;

  openMarkerModal: (id: string | null) => void;
  closeMarkerModal: () => void;

  fileDuration: number;
  setFileDuration: (seconds: number) => void;

  isTrackSegmentsModalOpen: boolean;
  segmentsFormKey: number;
  /** Which track is being edited in the segment modal (`null` when closed). */
  segmentEditTrackIndex: number | null;
  openTrackSegmentsModal: (trackIndex: number) => void;
  closeTrackSegmentsModal: () => void;
  setTrackSegments: (
    updates: Array<{ index: number; segmentStart: number; segmentEnd: number }>,
  ) => void;
};

const initialSteps: RehearsalStep[] = [
  { id: "step-basico-a", title: "Paso básico", startTime: 0 },
  { id: "step-1", title: "Paso 1", startTime: 8 },
  { id: "step-2", title: "Paso 2", startTime: 20 },
  { id: "step-basico-b", title: "Paso básico", startTime: 36 },
  { id: "step-3", title: "Paso 3", startTime: 48 },
  { id: "step-final", title: "Paso final / transición", startTime: 100 },
];

const exampleMarkersBase = [
  {
    id: nanoid(8),
    time: 4,
    type: "action" as const,
    title: "Levantar sombreros",
    note: "Todos a la vez, mirando al frente.",
  },
  {
    id: nanoid(8),
    time: 12,
    type: "comment" as const,
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
    type: "action" as const,
    title: "Bajar manos",
    note: "Movimiento suave, contar 4 tiempos.",
  },
  {
    id: nanoid(8),
    time: 56,
    type: "action" as const,
    title: "Ir a esquinas",
    note: "Cuatro grupos a las cuatro esquinas.",
  },
  {
    id: nanoid(8),
    time: 125,
    type: "cue" as const,
    title: "Transición a canción 2",
    note: "Primer bloque del segundo tema.",
  },
];

const exampleMarkers: Marker[] = exampleMarkersBase.map((m) => ({
  ...m,
  stepId: resolveStepIdAtTime(initialSteps, m.time),
  cueEndTime: null,
}));

/** Song 1: 0:00–2:09 · Song 2: 1:00–2:11 · Song 3: 0:50–3:00 (in-file windows) */
const initialTracks: Track[] = [
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

const initialProject: Project = {
  title: "Choreography demo",
  tracks: initialTracks,
  steps: initialSteps,
  markers: exampleMarkers,
  loopRegion: undefined,
};

const sortByTime = (markers: Marker[]) =>
  [...markers].sort((a, b) => a.time - b.time);

const STORAGE_KEY = "melodia.timeline.v1";

function mergeTracksFromStorage(raw: unknown, fallback: Track[]): Track[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return raw.map((item, i) => {
    const t = item as Partial<Track>;
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
      src: typeof t.src === "string" && t.src ? t.src : (f?.src ?? "/audio/song-1.mp3"),
      segmentStart,
      segmentEnd,
    };
  });
}

function mergeStepsFromStorage(
  raw: unknown,
  fallback: RehearsalStep[],
): RehearsalStep[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
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
    const typ: MarkerType =
      m.type === "comment" || m.type === "action" || m.type === "cue"
        ? m.type
        : "comment";
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

function mergeProjectFromStorage(raw: unknown): Project {
  if (!raw || typeof raw !== "object") return initialProject;
  const p = raw as Partial<Project>;
  const tracks = mergeTracksFromStorage(p.tracks, initialProject.tracks);
  const steps = mergeStepsFromStorage(p.steps, initialProject.steps);
  let markers = mergeMarkersFromStorage(p.markers, steps);
  markers = markers.map((m) => ({
    ...m,
    stepId:
      m.stepId != null && steps.some((s) => s.id === m.stepId)
        ? m.stepId
        : resolveStepIdAtTime(steps, m.time),
  }));
  const title =
    typeof p.title === "string" && p.title.trim()
      ? p.title.trim()
      : initialProject.title;
  let loopRegion: LoopRegion | undefined;
  if (
    p.loopRegion &&
    typeof p.loopRegion.start === "number" &&
    typeof p.loopRegion.end === "number" &&
    Number.isFinite(p.loopRegion.start) &&
    Number.isFinite(p.loopRegion.end)
  ) {
    loopRegion = {
      start: Math.max(0, p.loopRegion.start),
      end: Math.max(p.loopRegion.start + 0.1, p.loopRegion.end),
      enabled: Boolean(p.loopRegion.enabled),
    };
  }
  const total = rehearsalDuration(tracks);
  if (loopRegion) {
    loopRegion.start = clamp(loopRegion.start, 0, total);
    loopRegion.end = clamp(loopRegion.end, loopRegion.start + 0.1, total);
  }
  return { title, tracks, steps, markers, loopRegion };
}

function mergePersistedTimeline(
  persistedState: unknown,
  currentState: TimelineState,
): TimelineState {
  const p = persistedState as
    | Partial<Pick<TimelineState, "project" | "activeTrackIndex" | "currentTime">>
    | undefined;
  if (!p?.project) return currentState;
  const project = mergeProjectFromStorage(p.project);
  const total = rehearsalDuration(project.tracks);
  const currentTime = clamp(
    typeof p.currentTime === "number" && Number.isFinite(p.currentTime)
      ? p.currentTime
      : 0,
    0,
    Math.max(0, total - 1e-6),
  );
  const { trackIndex, fileTime } = globalTimeToTrackFile(project.tracks, currentTime);
  return {
    ...currentState,
    project,
    activeTrackIndex: trackIndex,
    currentTime,
    pendingFileSeek: fileTime,
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

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
  project: initialProject,
  currentTime: 0,
  isPlaying: false,
  audioError: null,
  trackLoadBusy: false,
  activeTrackIndex: 0,
  pendingFileSeek: null,
  selectedMarkerId: null,
  isMarkerModalOpen: false,

  fileDuration: 0,
  isTrackSegmentsModalOpen: false,
  segmentsFormKey: 0,
  segmentEditTrackIndex: null as number | null,

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setAudioError: (error) => set({ audioError: error }),
  setTrackLoadBusy: (busy) => set({ trackLoadBusy: busy }),

  setActiveTrackIndex: (index) =>
    set((state) => ({
      activeTrackIndex: clamp(
        index,
        0,
        Math.max(0, state.project.tracks.length - 1),
      ),
    })),

  clearPendingFileSeek: () => set({ pendingFileSeek: null }),

  seekRehearsal: (globalSeconds) => {
    const { project } = get();
    const tracks = project.tracks;
    const total = rehearsalDuration(tracks);
    const g = clamp(globalSeconds, 0, Math.max(0, total - 1e-6));
    const { trackIndex, fileTime } = globalTimeToTrackFile(tracks, g);
    set({
      currentTime: g,
      activeTrackIndex: trackIndex,
      pendingFileSeek: fileTime,
    });
  },

  jumpToTrack: (trackIndex) => {
    const { project } = get();
    const tracks = project.tracks;
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

  skipRehearsal: (deltaSeconds) => {
    const { project, currentTime } = get();
    const total = rehearsalDuration(project.tracks);
    get().seekRehearsal(clamp(currentTime + deltaSeconds, 0, total));
  },

  addMarker: (globalTime, type = "comment") => {
    const id = nanoid(8);
    const { project } = get();
    const total = rehearsalDuration(project.tracks);
    const t = clamp(globalTime, 0, Math.max(0, total - 1e-6));
    const stepId = resolveStepIdAtTime(project.steps, t);
    set((state) => ({
      project: {
        ...state.project,
        markers: sortByTime([
          ...state.project.markers,
          { id, time: t, type, title: "New marker", note: "", stepId, cueEndTime: null },
        ]),
      },
      selectedMarkerId: id,
      isMarkerModalOpen: true,
    }));
    return id;
  },

  updateMarker: (id, patch) =>
    set((state) => ({
      project: {
        ...state.project,
        markers: sortByTime(
          state.project.markers.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        ),
      },
    })),

  deleteMarker: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        markers: state.project.markers.filter((m) => m.id !== id),
      },
      selectedMarkerId: null,
      isMarkerModalOpen: false,
    })),

  setLoopRegion: (start, end) =>
    set((state) => {
      const total = rehearsalDuration(state.project.tracks);
      const safeStart = clamp(Math.min(start, end), 0, total);
      const safeEnd = clamp(Math.max(start, end), safeStart + 0.1, total);
      return {
        project: {
          ...state.project,
          loopRegion: {
            start: safeStart,
            end: safeEnd,
            enabled: state.project.loopRegion?.enabled ?? true,
          },
        },
      };
    }),

  toggleLoopEnabled: () =>
    set((state) => {
      if (!state.project.loopRegion) return state;
      return {
        project: {
          ...state.project,
          loopRegion: {
            ...state.project.loopRegion,
            enabled: !state.project.loopRegion.enabled,
          },
        },
      };
    }),

  clearLoopRegion: () =>
    set((state) => ({
      project: { ...state.project, loopRegion: undefined },
    })),

  openMarkerModal: (id) =>
    set({ selectedMarkerId: id, isMarkerModalOpen: true }),
  closeMarkerModal: () => set({ isMarkerModalOpen: false }),

  setFileDuration: (seconds) =>
    set({ fileDuration: Number.isFinite(seconds) ? Math.max(0, seconds) : 0 }),

  openTrackSegmentsModal: (trackIndex) =>
    set((s) => {
      const n = s.project.tracks.length;
      if (n === 0) return s;
      const i = clamp(trackIndex, 0, n - 1);
      return {
        isTrackSegmentsModalOpen: true,
        segmentEditTrackIndex: i,
        segmentsFormKey: s.segmentsFormKey + 1,
      };
    }),
  closeTrackSegmentsModal: () =>
    set({
      isTrackSegmentsModalOpen: false,
      segmentEditTrackIndex: null,
    }),

  setTrackSegments: (updates) =>
    set((state) => {
      const nextTracks = state.project.tracks.map((t) => ({ ...t }));
      for (const u of updates) {
        const i = clamp(u.index, 0, Math.max(0, nextTracks.length - 1));
        const a = Math.max(0, u.segmentStart);
        const b = Math.max(a + 0.25, u.segmentEnd);
        nextTracks[i] = { ...nextTracks[i], segmentStart: a, segmentEnd: b };
      }
      const total = rehearsalDuration(nextTracks);
      const newCurrent = clamp(state.currentTime, 0, Math.max(0, total - 1e-6));
      const { trackIndex, fileTime } = globalTimeToTrackFile(
        nextTracks,
        newCurrent,
      );
      return {
        project: { ...state.project, tracks: nextTracks },
        currentTime: newCurrent,
        activeTrackIndex: trackIndex,
        pendingFileSeek: fileTime,
      };
    }),
}),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage() : localStorage,
      ),
      partialize: (s) => ({
        project: s.project,
        activeTrackIndex: s.activeTrackIndex,
        currentTime: s.currentTime,
      }),
      merge: (persistedState, currentState) =>
        mergePersistedTimeline(persistedState, currentState),
    },
  ),
);
