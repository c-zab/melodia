"use client";

import { Activity, Bookmark, MessageSquare, Music } from "lucide-react";

import MarkerModal from "@/components/MarkerModal";
import PlaybackControls from "@/components/PlaybackControls";
import SegmentEditModal from "@/components/SegmentEditModal";
import WaveformPlayer from "@/components/WaveformPlayer";
import {
  markerGlobalToFileInTrack,
  markerOffsetInStep,
  rehearsalDuration,
  resolveStepIdAtTime,
  type RehearsalStep,
} from "@/lib/rehearsal";
import { formatTime, seekToTime } from "@/lib/wavesurfer";
import { useTimelineStore, type Marker, type MarkerType } from "@/store/useTimelineStore";

const MARKER_ICON: Record<MarkerType, typeof Activity> = {
  comment: MessageSquare,
  action: Activity,
  cue: Bookmark,
};

const MARKER_DOT: Record<MarkerType, string> = {
  comment: "bg-sky-400",
  action: "bg-violet-400",
  cue: "bg-amber-400",
};

const TRACK_PILL_ACTIVE =
  "bg-violet-500/20 text-violet-100 ring-2 ring-violet-400/70 shadow-sm shadow-violet-500/10";
const TRACK_PILL_IDLE =
  "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-200";

export default function Home() {
  const project = useTimelineStore((s) => s.project);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const openMarkerModal = useTimelineStore((s) => s.openMarkerModal);
  const jumpToTrack = useTimelineStore((s) => s.jumpToTrack);

  const tracks = project.tracks;
  const steps = project.steps;
  const total = rehearsalDuration(tracks);

  const trackOrder = [
    activeTrackIndex,
    ...tracks.map((_, i) => i).filter((i) => i !== activeTrackIndex),
  ];
  const activeTrack = tracks[activeTrackIndex];
  const markersThisBlock = project.markers.filter(
    (m) =>
      markerGlobalToFileInTrack(tracks, activeTrackIndex, m.time) !== null,
  );
  const currentStepId =
    steps.length > 0 ? resolveStepIdAtTime(steps, currentTime) : null;
  const cueGroups = markersGroupedByStep(
    markersThisBlock,
    steps,
    currentTime,
  );
  const totalMarkers = project.markers.length;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 px-4 pb-4 pt-5 backdrop-blur sm:px-6 sm:pt-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30">
              <Music className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                Melodia
              </h1>
              <p className="truncate text-[11px] text-zinc-500">
                {project.title}
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:max-w-md sm:items-end">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:text-right">
              Active song
            </p>
            <nav
              className="flex flex-wrap gap-1.5 sm:justify-end"
              aria-label="Choose rehearsal block"
            >
              {trackOrder.map((i) => {
                const tr = tracks[i];
                if (!tr) return null;
                const active = i === activeTrackIndex;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => jumpToTrack(i)}
                    aria-current={active ? "true" : undefined}
                    className={`rounded-full px-3 py-1.5 text-left text-xs font-medium transition ${
                      active ? TRACK_PILL_ACTIVE : TRACK_PILL_IDLE
                    }`}
                  >
                    <span className="font-mono text-[10px] text-zinc-500">
                      {i + 1}
                    </span>{" "}
                    <span className="text-zinc-100">{tr.name}</span>
                  </button>
                );
              })}
            </nav>
            <p className="font-mono text-[11px] text-zinc-500 sm:text-right">
              <span className="text-zinc-300">{formatTime(currentTime)}</span>
              <span className="text-zinc-600"> · </span>
              rehearsal {formatTime(total)}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 sm:px-6 sm:pb-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <WaveformPlayer />

          <section>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Pasos y cues
                </h2>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  Solo este bloque:{" "}
                  <span className="font-medium text-zinc-400">
                    {activeTrack?.name ?? "—"}
                  </span>
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-600">
                  Un <span className="text-zinc-400">paso</span> agrupa varias{" "}
                  <span className="text-zinc-400">cues</span> (instante o tramo).
                  El reloj principal es el de “Rehearsal”; debajo,{" "}
                  <span className="text-zinc-400">+tiempo en el paso</span> cuenta
                  desde el inicio de ese paso.
                </p>
              </div>
              <span className="shrink-0 text-right text-[11px] text-zinc-500">
                <span className="font-mono text-zinc-400">
                  {markersThisBlock.length}
                </span>{" "}
                aquí
                {totalMarkers !== markersThisBlock.length ? (
                  <>
                    <span className="text-zinc-600"> · </span>
                    <span className="font-mono">{totalMarkers}</span> total
                  </>
                ) : null}
              </span>
            </div>
            {totalMarkers === 0 ? (
              <ul className="space-y-2">
                <li className="rounded-xl bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
                  No markers yet. Tap the <span className="font-medium text-zinc-300">+</span>{" "}
                  button while playing to add one.
                </li>
              </ul>
            ) : markersThisBlock.length === 0 ? (
              <ul className="space-y-2">
                <li className="rounded-xl bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
                  No hay markers en{" "}
                  <span className="font-medium text-zinc-300">
                    {activeTrack?.name ?? "este bloque"}
                  </span>
                  . Cambia de canción arriba o añade cues mientras suene este tema.
                </li>
              </ul>
            ) : (
              <div className="space-y-6">
                {cueGroups.map((group) => {
                  const isCurrentStep =
                    group.key === "all" ||
                    (currentStepId != null && group.key === currentStepId);
                  return (
                    <section
                      key={group.key}
                      aria-current={isCurrentStep ? "step" : undefined}
                      className={
                        isCurrentStep
                          ? "rounded-2xl border border-violet-400/45 bg-violet-500/[0.09] p-3 shadow-sm shadow-violet-950/25 transition-colors"
                          : "rounded-2xl border border-zinc-800/50 bg-zinc-950/25 p-3 opacity-[0.78] transition-colors"
                      }
                    >
                      {group.heading ? (
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3
                              className={`truncate text-[11px] font-semibold uppercase tracking-wider ${
                                isCurrentStep ? "text-violet-100/95" : "text-zinc-500"
                              }`}
                            >
                              {group.heading}
                            </h3>
                            {isCurrentStep ? (
                              <span className="shrink-0 rounded-md bg-violet-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-50 ring-1 ring-violet-400/50">
                                Active
                              </span>
                            ) : null}
                          </div>
                          <span
                            className={`shrink-0 text-[10px] ${
                              isCurrentStep ? "text-violet-200/70" : "text-zinc-600"
                            }`}
                          >
                            Cues
                          </span>
                        </div>
                      ) : null}
                      <ul className="space-y-2">
                        {group.markers.map((marker) => {
                          const Icon = MARKER_ICON[marker.type];
                          const cueHot = isCuePlaybackActive(marker, currentTime);
                          const intoStep = markerOffsetInStep(steps, marker);
                          return (
                            <li key={marker.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  seekToTime(marker.time);
                                  openMarkerModal(marker.id);
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ring-1 transition ${
                                  cueHot
                                    ? "bg-violet-500/15 ring-violet-400/75 shadow-sm shadow-violet-950/20"
                                    : isCurrentStep
                                      ? "bg-zinc-900/65 ring-zinc-800 hover:bg-zinc-900 hover:ring-zinc-700"
                                      : "bg-zinc-900/40 ring-zinc-800/70 text-zinc-300 hover:bg-zinc-900/55 hover:text-zinc-100 hover:ring-zinc-600/80"
                                }`}
                              >
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-200 ring-1 ${
                                    cueHot
                                      ? "bg-violet-500/25 ring-violet-400/50"
                                      : "bg-zinc-800 ring-zinc-700"
                                  } ${!isCurrentStep && !cueHot ? "opacity-80" : ""}`}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${MARKER_DOT[marker.type]}`}
                                    />
                                    <p className="truncate text-sm font-medium text-zinc-100">
                                      {marker.title}
                                    </p>
                                  </div>
                                  {marker.note ? (
                                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                                      {marker.note}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-0.5">
                                  <span className="rounded-md bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-300 ring-1 ring-zinc-800">
                                    {formatTime(marker.time)}
                                    {marker.cueEndTime != null &&
                                    marker.cueEndTime > marker.time + 0.05
                                      ? `–${formatTime(marker.cueEndTime)}`
                                      : ""}
                                  </span>
                                  {intoStep != null ? (
                                    <span className="font-mono text-[10px] text-zinc-500">
                                      +{formatTime(intoStep)} en paso
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <PlaybackControls />
      <MarkerModal />
      <SegmentEditModal />
    </div>
  );
}

function isCuePlaybackActive(marker: Marker, t: number): boolean {
  const end = marker.cueEndTime;
  if (
    typeof end === "number" &&
    Number.isFinite(end) &&
    end > marker.time + 0.08
  ) {
    return t + 1e-6 >= marker.time && t <= end + 0.08;
  }
  return Math.abs(t - marker.time) < 0.65;
}

function markersGroupedByStep(
  markers: Marker[],
  steps: RehearsalStep[],
  currentTime: number,
): { key: string; heading: string | null; markers: Marker[] }[] {
  const sortedSteps = [...steps].sort((a, b) => a.startTime - b.startTime);
  if (sortedSteps.length === 0) {
    return [
      {
        key: "all",
        heading: null,
        markers: [...markers].sort((a, b) => a.time - b.time),
      },
    ];
  }
  const stepIds = new Set(sortedSteps.map((s) => s.id));
  const groups = sortedSteps
    .map((step) => ({
      key: step.id,
      heading: step.title,
      markers: markers
        .filter((m) => m.stepId === step.id)
        .sort((a, b) => a.time - b.time),
    }))
    .filter((g) => g.markers.length > 0);
  const orphans = markers
    .filter((m) => m.stepId == null || !stepIds.has(m.stepId))
    .sort((a, b) => a.time - b.time);
  if (orphans.length > 0) {
    groups.push({
      key: "unassigned",
      heading: "Sin clasificar",
      markers: orphans,
    });
  }
  const currentStepId = resolveStepIdAtTime(steps, currentTime);
  if (!currentStepId || groups.length <= 1) return groups;
  const activeIdx = groups.findIndex((g) => g.key === currentStepId);
  if (activeIdx <= 0) return groups;
  const first = groups[activeIdx];
  return [first, ...groups.filter((_, i) => i !== activeIdx)];
}
