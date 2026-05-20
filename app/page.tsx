"use client";

import { Activity, Bookmark, MessageSquare, Music } from "lucide-react";

import MarkerModal from "@/components/MarkerModal";
import PlaybackControls from "@/components/PlaybackControls";
import SegmentEditModal from "@/components/SegmentEditModal";
import WaveformPlayer from "@/components/WaveformPlayer";
import {
  globalToBlockPosition,
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
  action: "bg-cyan-400",
  cue: "bg-amber-400",
};

const MAX_VISIBLE_STEPS = 4;

const TRACK_PILL_ACTIVE =
  "bg-cyan-500/15 text-cyan-100 ring-2 ring-cyan-400/60 shadow-sm shadow-cyan-500/10";
const TRACK_PILL_IDLE =
  "bg-slate-900/90 text-slate-400 ring-1 ring-slate-700/80 hover:bg-slate-800 hover:text-slate-200";

export default function Home() {
  const project = useTimelineStore((s) => s.project);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const openMarkerModal = useTimelineStore((s) => s.openMarkerModal);
  const jumpToTrack = useTimelineStore((s) => s.jumpToTrack);
  const trackLoadBusy = useTimelineStore((s) => s.trackLoadBusy);

  const tracks = project.tracks;
  const steps = project.steps;
  const total = rehearsalDuration(tracks);

  const activeTrack = tracks[activeTrackIndex];
  const blockPos = globalToBlockPosition(tracks, activeTrackIndex, currentTime);
  const markersThisBlock = project.markers.filter(
    (m) =>
      markerGlobalToFileInTrack(tracks, activeTrackIndex, m.time) !== null,
  );
  const currentStepId =
    steps.length > 0 ? resolveStepIdAtTime(steps, currentTime) : null;
  const { groups: cueGroups, hiddenStepCount } = markersGroupedByStep(
    markersThisBlock,
    steps,
    currentTime,
    MAX_VISIBLE_STEPS,
  );
  const totalMarkers = project.markers.length;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95 px-4 pb-4 pt-5 backdrop-blur sm:px-6 sm:pt-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">
              <Music className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                Melodia
              </h1>
              <p className="truncate text-[11px] text-slate-500">
                {project.title}
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:max-w-md sm:items-end">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-right">
              Active song
            </p>
            <nav
              className="flex flex-wrap gap-1.5 sm:justify-end"
              aria-label="Choose rehearsal block"
            >
              {tracks.map((tr, i) => {
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
                    <span className="font-mono text-[10px] text-slate-500">
                      {i + 1}
                    </span>{" "}
                    <span className="text-slate-100">{tr.name}</span>
                  </button>
                );
              })}
            </nav>
            <p className="font-mono text-[11px] text-slate-500 sm:text-right">
              {trackLoadBusy ? (
                <span className="text-cyan-300/90">
                  Switching to {activeTrack?.name ?? "track"}…
                </span>
              ) : (
                <>
                  <span className="text-slate-300">
                    {formatTime(blockPos.localInBlock)}
                  </span>
                  <span className="text-slate-600">
                    {" "}
                    / {formatTime(blockPos.blockDuration)} in{" "}
                    {activeTrack?.name ?? "block"}
                  </span>
                  <span className="text-slate-600"> · </span>
                  <span className="text-slate-500">
                    rehearsal {formatTime(currentTime)} / {formatTime(total)}
                  </span>
                </>
              )}
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
                <h2 className="text-sm font-semibold text-slate-200">
                  Choreography cues
                </h2>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  This block:{" "}
                  <span className="font-medium text-slate-400">
                    {activeTrack?.name ?? "—"}
                  </span>
                  {hiddenStepCount > 0 ? (
                    <>
                      {" "}
                      · showing {cueGroups.length} of{" "}
                      {cueGroups.length + hiddenStepCount} steps
                    </>
                  ) : null}
                </p>
              </div>
              <span className="shrink-0 text-right text-[11px] text-slate-500">
                <span className="font-mono text-slate-400">
                  {markersThisBlock.length}
                </span>{" "}
                cues
                {totalMarkers !== markersThisBlock.length ? (
                  <>
                    <span className="text-slate-600"> · </span>
                    <span className="font-mono">{totalMarkers}</span> total
                  </>
                ) : null}
              </span>
            </div>
            {totalMarkers === 0 ? (
              <ul className="space-y-2">
                <li className="rounded-xl bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-800">
                  No markers yet. Tap the <span className="font-medium text-slate-300">+</span>{" "}
                  button while playing to add one.
                </li>
              </ul>
            ) : markersThisBlock.length === 0 ? (
              <ul className="space-y-2">
                <li className="rounded-xl bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-800">
                  No cues in{" "}
                  <span className="font-medium text-slate-300">
                    {activeTrack?.name ?? "this block"}
                  </span>
                  . Switch song above or add cues while this track plays.
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
                          ? "rounded-2xl border border-cyan-400/40 bg-cyan-500/[0.08] p-3 shadow-sm shadow-cyan-950/20 transition-colors"
                          : "rounded-2xl border border-slate-800/60 bg-slate-950/30 p-3 opacity-[0.82] transition-colors"
                      }
                    >
                      {group.heading ? (
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3
                              className={`truncate text-[11px] font-semibold uppercase tracking-wider ${
                                isCurrentStep ? "text-cyan-100/95" : "text-slate-500"
                              }`}
                            >
                              {group.heading}
                            </h3>
                            {isCurrentStep ? (
                              <span className="shrink-0 rounded-md bg-cyan-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-50 ring-1 ring-cyan-400/45">
                                Now
                              </span>
                            ) : null}
                          </div>
                          <span
                            className={`shrink-0 text-[10px] ${
                              isCurrentStep ? "text-cyan-200/70" : "text-slate-600"
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
                                    ? "bg-cyan-500/12 ring-cyan-400/60 shadow-sm shadow-cyan-950/15"
                                    : isCurrentStep
                                      ? "bg-slate-900/70 ring-slate-700/80 hover:bg-slate-900 hover:ring-slate-600"
                                      : "bg-slate-900/45 ring-slate-800/70 text-slate-300 hover:bg-slate-900/60 hover:text-slate-100 hover:ring-slate-600/80"
                                }`}
                              >
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-200 ring-1 ${
                                    cueHot
                                      ? "bg-cyan-500/20 ring-cyan-400/45"
                                      : "bg-slate-800 ring-slate-700"
                                  } ${!isCurrentStep && !cueHot ? "opacity-80" : ""}`}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${MARKER_DOT[marker.type]}`}
                                    />
                                    <p className="truncate text-sm font-medium text-slate-100">
                                      {marker.title}
                                    </p>
                                  </div>
                                  {marker.note ? (
                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                      {marker.note}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-0.5">
                                  <span className="rounded-md bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300 ring-1 ring-slate-800">
                                    {formatTime(marker.time)}
                                    {marker.cueEndTime != null &&
                                    marker.cueEndTime > marker.time + 0.05
                                      ? `–${formatTime(marker.cueEndTime)}`
                                      : ""}
                                  </span>
                                  {intoStep != null ? (
                                    <span className="font-mono text-[10px] text-slate-500">
                                      +{formatTime(intoStep)} in step
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

type CueStepGroup = {
  key: string;
  heading: string | null;
  markers: Marker[];
};

function markersGroupedByStep(
  markers: Marker[],
  steps: RehearsalStep[],
  currentTime: number,
  maxVisible: number,
): { groups: CueStepGroup[]; hiddenStepCount: number } {
  const sortedSteps = [...steps].sort((a, b) => a.startTime - b.startTime);
  if (sortedSteps.length === 0) {
    return {
      groups: [
        {
          key: "all",
          heading: null,
          markers: [...markers].sort((a, b) => a.time - b.time),
        },
      ],
      hiddenStepCount: 0,
    };
  }
  const stepIds = new Set(sortedSteps.map((s) => s.id));
  const stepStartById = new Map(sortedSteps.map((s) => [s.id, s.startTime]));
  const groups: CueStepGroup[] = sortedSteps
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
      heading: "Unassigned",
      markers: orphans,
    });
  }

  const currentStepId = resolveStepIdAtTime(steps, currentTime);
  const anchor = currentStepId
    ? (stepStartById.get(currentStepId) ?? currentTime)
    : currentTime;

  const rank = (g: CueStepGroup) => {
    if (g.key === currentStepId) return -1;
    if (g.key === "unassigned") return 1e6;
    const t = stepStartById.get(g.key);
    return t == null ? 1e5 : Math.abs(t - anchor);
  };

  groups.sort((a, b) => rank(a) - rank(b));
  const hiddenStepCount = Math.max(0, groups.length - maxVisible);
  const visible = groups.slice(0, maxVisible);

  if (currentStepId) {
    const curIdx = visible.findIndex((g) => g.key === currentStepId);
    if (curIdx > 0) {
      const [current] = visible.splice(curIdx, 1);
      visible.unshift(current);
    }
  }

  return { groups: visible, hiddenStepCount };
}
