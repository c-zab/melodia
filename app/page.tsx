"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

import { LOGO_PATH } from "@/lib/brand";
import { useLocale } from "@/hooks/useLocale";

import InfoModal, { InfoTrigger } from "@/components/InfoModal";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import MarkerModal from "@/components/MarkerModal";
import PlaybackControls from "@/components/PlaybackControls";
import WaveformPlayer from "@/components/WaveformPlayer";
import {
  getActiveMix,
  isCompositeMix,
  mixPlaybackDuration,
} from "@/lib/mix";
import {
  markerOffsetInStep,
  resolveStepIdAtTime,
  type RehearsalStep,
} from "@/lib/rehearsal";
import { useMarkerPress } from "@/hooks/useMarkerPress";
import { categoryLabel } from "@/lib/dances";
import {
  MARKER_CUE_LEAD_SECONDS,
  MARKER_META,
  markerIsJumpable,
} from "@/lib/markers";
import { formatTime } from "@/lib/wavesurfer";
import {
  useTimelineStore,
  type Marker,
} from "@/store/useTimelineStore";

const MAX_VISIBLE_STEPS = 4;

export default function Home() {
  const { t } = useLocale();
  const [infoOpen, setInfoOpen] = useState(false);
  const mixes = useTimelineStore((s) => s.mixes);
  const activeMixId = useTimelineStore((s) => s.activeMixId);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const setActiveMix = useTimelineStore((s) => s.setActiveMix);
  const trackLoadBusy = useTimelineStore((s) => s.trackLoadBusy);
  const audioError = useTimelineStore((s) => s.audioError);

  const mix = getActiveMix(mixes, activeMixId);
  const duration = mix ? mixPlaybackDuration(mix) : 0;
  const mixIsReady = !trackLoadBusy && !audioError && duration > 0;
  const markers = mix?.markers ?? [];
  const steps = mix?.steps ?? [];

  const currentStepId =
    steps.length > 0 ? resolveStepIdAtTime(steps, currentTime) : null;
  const { groups: cueGroups, hiddenStepCount } = markersGroupedByStep(
    markers,
    steps,
    currentTime,
    MAX_VISIBLE_STEPS,
    t("common.unassigned"),
  );

  const headerSubtitle = mix
    ? isCompositeMix(mix)
      ? `${categoryLabel(mix.category)} · ${t("header.threeSongMix")}`
      : categoryLabel(mix.category)
    : t("header.rehearsalPlayer");

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-[var(--background)] text-stone-100">
      <header className="border-b border-stone-800/80 bg-[var(--background)]/95 px-4 pb-5 pt-5 backdrop-blur sm:px-6 sm:pt-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src={LOGO_PATH}
              alt={t("brand.logoAlt")}
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain drop-shadow-sm"
              priority
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold tracking-tight text-stone-50 sm:text-lg">
                {t("brand.title")}
              </h1>
              <p className="mt-0.5 text-[11px] text-stone-500">{headerSubtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <LocaleSwitcher />
              <InfoTrigger onClick={() => setInfoOpen(true)} />
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[12rem] sm:items-end">
            <label className="relative block w-full">
              <span className="sr-only">{t("header.chooseMix")}</span>
              <select
                value={activeMixId}
                onChange={(event) => setActiveMix(event.target.value)}
                aria-label={t("header.chooseMix")}
                className="w-full appearance-none rounded-xl bg-stone-900/90 py-2.5 pl-3.5 pr-10 text-sm font-medium text-stone-100 ring-1 ring-stone-700/80 transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
              >
                {mixes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                aria-hidden
              />
            </label>
            <p className="font-mono text-[11px] leading-relaxed text-stone-500 sm:text-right">
              {trackLoadBusy ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--accent-text)]">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent-text)]" />
                  {t("header.loadingMix", { name: mix ? mix.name : "mix" })}
                </span>
              ) : (
                <>
                  <span className="text-stone-300">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-stone-600"> / {formatTime(duration)}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 sm:px-6 sm:pb-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <WaveformPlayer />

          {mixIsReady ? (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-stone-200">
                    {t("cues.sectionTitle")}
                  </h2>
                  <p className="mt-1 truncate text-[11px] text-stone-500">
                    {mix
                      ? `${categoryLabel(mix.category)} · ${mix.name}`
                      : null}
                    {hiddenStepCount > 0 ? (
                      <>
                        {" "}
                        {t("cues.showingSteps", {
                          visible: cueGroups.length,
                          total: cueGroups.length + hiddenStepCount,
                        })}
                      </>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 text-right text-[11px] text-stone-500">
                  <span className="font-mono text-stone-400">
                    {markers.length}
                  </span>{" "}
                  {markers.length === 1
                    ? t("common.cue")
                    : t("common.cuesPlural")}
                </span>
              </div>
              {markers.length === 0 ? (
                <ul className="space-y-2">
                  <li className="rounded-xl bg-stone-900/50 px-4 py-6 text-center text-sm text-stone-500 ring-1 ring-stone-800">
                    {t("cues.emptyBefore")}{" "}
                    <span className="font-medium text-stone-300">+</span>{" "}
                    {t("cues.emptyAfter")}
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
                            ? "rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-muted)] p-3 shadow-sm shadow-black/30 transition-colors"
                            : "rounded-2xl border border-stone-800/60 bg-stone-950/30 p-3 opacity-[0.82] transition-colors"
                        }
                      >
                        {group.heading ? (
                          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <h3
                                className={`truncate text-[11px] font-semibold uppercase tracking-wider ${
                                  isCurrentStep
                                    ? "text-[var(--accent-text)]"
                                    : "text-stone-500"
                                }`}
                              >
                                {group.heading}
                              </h3>
                              {isCurrentStep ? (
                                <span className="shrink-0 rounded-md bg-[var(--accent-muted)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-text)] ring-1 ring-[var(--accent-ring)]">
                                  {t("common.now")}
                                </span>
                              ) : null}
                            </div>
                            <span
                              className={`shrink-0 text-[10px] ${
                                isCurrentStep
                                  ? "text-[var(--accent-text-muted)]"
                                  : "text-stone-600"
                              }`}
                            >
                              {t("common.cues")}
                            </span>
                          </div>
                        ) : null}
                        <ul className="space-y-2">
                          {group.markers.map((marker) => {
                            const { Icon, dot } = MARKER_META[marker.type];
                            const jumpable = markerIsJumpable(marker.type);
                            const cueHot =
                              jumpable &&
                              isCuePlaybackActive(marker, currentTime);
                            const intoStep = markerOffsetInStep(steps, marker);
                            const rowClass = `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ring-1 transition ${
                              cueHot
                                ? "bg-[var(--accent-muted)] ring-[var(--accent-ring)] shadow-sm shadow-black/20"
                                : isCurrentStep
                                  ? "bg-stone-900/70 ring-stone-700/80"
                                  : "bg-stone-900/45 ring-stone-800/70 text-stone-300"
                            } ${
                              jumpable
                                ? isCurrentStep
                                  ? "hover:bg-stone-900 hover:ring-stone-600"
                                  : "hover:bg-stone-900/60 hover:text-stone-100 hover:ring-stone-600/80"
                                : ""
                            }`;
                            const body = (
                              <>
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-200 ring-1 ${
                                    cueHot
                                      ? "bg-[var(--accent-muted)] ring-[var(--accent-ring)]"
                                      : "bg-stone-800 ring-stone-700"
                                  } ${!isCurrentStep && !cueHot ? "opacity-80" : ""}`}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
                                    />
                                    <p className="truncate text-sm font-medium text-stone-100">
                                      {marker.title}
                                    </p>
                                  </div>
                                  {marker.note ? (
                                    <p className="mt-0.5 truncate text-xs text-stone-500">
                                      {marker.note}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-0.5">
                                  <span className="rounded-md bg-stone-950 px-2 py-0.5 font-mono text-[11px] text-stone-300 ring-1 ring-stone-800">
                                    {formatTime(marker.time)}
                                    {marker.cueEndTime != null &&
                                    marker.cueEndTime > marker.time + 0.05
                                      ? `–${formatTime(marker.cueEndTime)}`
                                      : ""}
                                  </span>
                                  {intoStep != null ? (
                                    <span className="font-mono text-[10px] text-stone-500">
                                      +{formatTime(intoStep)} {t("common.inStep")}
                                    </span>
                                  ) : null}
                                </div>
                              </>
                            );
                            return (
                              <li key={marker.id}>
                                {jumpable ? (
                                  <CueListRow
                                    markerId={marker.id}
                                    markerTime={marker.time}
                                    className={rowClass}
                                  >
                                    {body}
                                  </CueListRow>
                                ) : (
                                  <div className={rowClass}>{body}</div>
                                )}
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
          ) : null}
        </div>
      </main>

      <PlaybackControls />
      <MarkerModal />
      <InfoModal open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  );
}

function CueListRow({
  markerId,
  markerTime,
  className,
  children,
}: {
  markerId: string;
  markerTime: number;
  className: string;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const press = useMarkerPress(markerId, markerTime);
  const hint = t("marker.tapJumpHoldEdit", {
    seconds: MARKER_CUE_LEAD_SECONDS,
  });

  return (
    <button
      type="button"
      {...press}
      className={`${className} select-none touch-manipulation`}
      title={hint}
      aria-label={hint}
    >
      {children}
    </button>
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
  unassignedLabel: string,
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
      heading: unassignedLabel,
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
