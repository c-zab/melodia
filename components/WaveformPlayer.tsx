"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Music2 } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {
  type Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";

import {
  danceFileToLocal,
  danceLocalToFile,
  loopRegionToFile,
} from "@/lib/dance";
import { useLocale } from "@/hooks/useLocale";
import { categoryLabel } from "@/lib/dances";
import {
  activeTrack,
  getActiveMix,
  isCompositeMix,
} from "@/lib/mix";
import {
  clamp,
  globalLoopToFileRegion,
  loopRestartGlobalTime,
  trackFileToGlobal,
} from "@/lib/rehearsal";
import { cssVar } from "@/lib/ui";
import { getWaveSurferInstance, setWaveSurferInstance } from "@/lib/wavesurfer";
import { useTimelineStore } from "@/store/useTimelineStore";
import TimelineMarkers from "./TimelineMarkers";
import TransitionStrip from "./TransitionStrip";

const LOOP_REGION_ID = "loop-region";
const SEGMENT_END_LEAD_SECONDS = 0.12;
const WAVE_HEIGHT = 120;

export default function WaveformPlayer() {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const loopRegionRef = useRef<Region | null>(null);
  const resumeAfterTrackLoadRef = useRef(false);
  const loadingSrcRef = useRef<string | null>(null);
  const suppressTimeSyncRef = useRef(false);
  const prevActiveSrcRef = useRef<string | null>(null);
  const loadSeqRef = useRef(0);
  const segmentBumpLockRef = useRef(false);

  const clearWaveRegions = () => {
    try {
      loopRegionRef.current?.remove();
    } catch {
      /* */
    }
    loopRegionRef.current = null;
  };

  const mixes = useTimelineStore((s) => s.mixes);
  const activeMixId = useTimelineStore((s) => s.activeMixId);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const mix = getActiveMix(mixes, activeMixId);
  const composite = mix ? isCompositeMix(mix) : false;
  const track = mix ? activeTrack(mix, activeTrackIndex) : undefined;
  const pendingFileSeek = useTimelineStore((s) => s.pendingFileSeek);
  const loopRegion = mix?.loopRegion;
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const setAudioError = useTimelineStore((s) => s.setAudioError);
  const setLoopRegion = useTimelineStore((s) => s.setLoopRegion);
  const setTrackLoadBusy = useTimelineStore((s) => s.setTrackLoadBusy);
  const audioError = useTimelineStore((s) => s.audioError);
  const trackLoadBusy = useTimelineStore((s) => s.trackLoadBusy);
  const fileDuration = useTimelineStore((s) => s.fileDuration);

  const [isReady, setIsReady] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const activeSrc = track?.src ?? "";
  const mixIsReady = isReady && loadedSrc === activeSrc && activeSrc.length > 0;
  const isLoadingMusic = trackLoadBusy || (!mixIsReady && !audioError);
  const showLoadError = Boolean(audioError) && !trackLoadBusy && !mixIsReady;

  useEffect(() => {
    if (pendingFileSeek == null || !mixIsReady) return;
    const ws = getWaveSurferInstance();
    if (!ws) return;
    ws.setTime(pendingFileSeek);
    useTimelineStore.getState().clearPendingFileSeek();
  }, [pendingFileSeek, mixIsReady]);

  useEffect(() => {
    if (!containerRef.current || wsRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const timeline = TimelinePlugin.create({
      height: 18,
      insertPosition: "beforebegin",
      primaryLabelInterval: 10,
      style: {
        color: "rgba(168, 162, 158, 0.55)",
        fontSize: "10px",
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      },
    });

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: cssVar("--wave-unplayed", "#78716c"),
      progressColor: cssVar("--wave-progress", "#f59e0b"),
      cursorColor: cssVar("--wave-cursor", "#fef3c7"),
      cursorWidth: 1.5,
      height: WAVE_HEIGHT,
      barWidth: 0,
      dragToSeek: true,
      normalize: true,
      backend: "MediaElement",
      plugins: [regions, timeline],
    });

    wsRef.current = ws;
    setWaveSurferInstance(ws);
    setAudioError(null);

    const bumpToNextTrack = () => {
      if (segmentBumpLockRef.current) return;
      const st = useTimelineStore.getState();
      const m = getActiveMix(st.mixes, st.activeMixId);
      if (!m || !isCompositeMix(m)) return;
      const tracks = m.tracks;
      const idx = st.activeTrackIndex;
      if (idx >= tracks.length - 1) return;
      const next = tracks[idx + 1];
      const wasPlaying = ws.isPlaying() || st.isPlaying;
      segmentBumpLockRef.current = true;
      if (wasPlaying) {
        resumeAfterTrackLoadRef.current = true;
        setIsPlaying(true);
      }
      suppressTimeSyncRef.current = true;
      const nextGlobal = trackFileToGlobal(
        tracks,
        idx + 1,
        next.segmentStart,
      );
      st.seekPlayback(nextGlobal);
    };

    const syncFromFileTime = (fileTime: number) => {
      if (suppressTimeSyncRef.current) return;
      const st = useTimelineStore.getState();
      const m = getActiveMix(st.mixes, st.activeMixId);
      if (!m) return;

      if (isCompositeMix(m)) {
        const tracks = m.tracks;
        const idx = st.activeTrackIndex;
        const tr = tracks[idx];
        if (!tr) return;

        let t = fileTime;
        if (t < tr.segmentStart) {
          t = tr.segmentStart;
          ws.setTime(t);
        }

        const endThreshold = tr.segmentEnd - SEGMENT_END_LEAD_SECONDS;
        const atSegmentEnd = t >= endThreshold;
        const playing = ws.isPlaying();

        if (atSegmentEnd && playing) {
          if (idx < tracks.length - 1) {
            bumpToNextTrack();
            return;
          }
          if (t > tr.segmentEnd) {
            t = tr.segmentEnd;
            ws.setTime(t);
          }
          void ws.pause();
          return;
        }

        if (t > tr.segmentEnd) {
          t = tr.segmentEnd;
          ws.setTime(t);
        }

        const globalT = trackFileToGlobal(tracks, idx, t);
        st.setCurrentTime(globalT);

        const loop = m.loopRegion;
        if (loop?.enabled && globalT >= loop.end - 0.05) {
          st.seekPlayback(
            loopRestartGlobalTime(tracks, idx, loop.start),
          );
        }
        return;
      }

      const tr = m.tracks[0];
      if (!tr) return;
      let t = fileTime;
      if (t < tr.segmentStart) {
        t = tr.segmentStart;
        ws.setTime(t);
      }
      if (t > tr.segmentEnd) {
        t = tr.segmentEnd;
        ws.setTime(t);
        if (ws.isPlaying()) void ws.pause();
        return;
      }
      const localT = danceFileToLocal(tr, t);
      st.setCurrentTime(localT);
      const loop = m.loopRegion;
      if (loop?.enabled && localT >= loop.end - 0.05) {
        st.seekPlayback(loop.start);
      }
    };

    const tickPlayback = () => {
      if (suppressTimeSyncRef.current || !ws.isPlaying()) return;
      syncFromFileTime(ws.getCurrentTime());
    };

    let segmentPollId: ReturnType<typeof setInterval> | null = null;
    const startSegmentPoll = () => {
      if (segmentPollId != null) return;
      segmentPollId = setInterval(tickPlayback, 100);
    };
    const stopSegmentPoll = () => {
      if (segmentPollId == null) return;
      clearInterval(segmentPollId);
      segmentPollId = null;
    };

    ws.on("timeupdate", syncFromFileTime);
    ws.on("audioprocess", syncFromFileTime);
    ws.on("seeking", syncFromFileTime);

    ws.on("interaction", (fileTime) => {
      const st = useTimelineStore.getState();
      const m = getActiveMix(st.mixes, st.activeMixId);
      if (!m) return;

      if (isCompositeMix(m)) {
        const tracks = m.tracks;
        const idx = st.activeTrackIndex;
        const tr = tracks[idx];
        if (!tr) return;
        const clamped = clamp(fileTime, tr.segmentStart, tr.segmentEnd);
        if (clamped !== fileTime) ws.setTime(clamped);
        st.setCurrentTime(trackFileToGlobal(tracks, idx, clamped));
        return;
      }

      const tr = m.tracks[0];
      if (!tr) return;
      const clamped = clamp(fileTime, tr.segmentStart, tr.segmentEnd);
      if (clamped !== fileTime) ws.setTime(clamped);
      st.setCurrentTime(danceFileToLocal(tr, clamped));
    });

    ws.on("play", () => {
      if (suppressTimeSyncRef.current) return;
      setIsPlaying(true);
      startSegmentPoll();
    });
    ws.on("pause", () => {
      stopSegmentPoll();
      if (suppressTimeSyncRef.current) return;
      setIsPlaying(false);
    });
    ws.on("finish", () => {
      stopSegmentPoll();
      if (suppressTimeSyncRef.current) return;
      const st = useTimelineStore.getState();
      const m = getActiveMix(st.mixes, st.activeMixId);
      if (m && isCompositeMix(m)) {
        const idx = st.activeTrackIndex;
        const tr = m.tracks[idx];
        if (tr && idx < m.tracks.length - 1) {
          const endThreshold = tr.segmentEnd - SEGMENT_END_LEAD_SECONDS;
          if (ws.getCurrentTime() >= endThreshold - 0.05) {
            bumpToNextTrack();
            return;
          }
        }
      }
      setIsPlaying(false);
    });
    ws.on("error", (error) => {
      if (suppressTimeSyncRef.current) return;
      const src = loadingSrcRef.current;
      if (!src) return;
      const st = useTimelineStore.getState();
      const m = getActiveMix(st.mixes, st.activeMixId);
      if (!m) return;
      const active = activeTrack(m, st.activeTrackIndex)?.src;
      if (active !== src) return;
      if (isBenignLoadError(error)) return;
      console.warn("[melodia] wavesurfer error", error);
      setAudioError(src);
    });

    regions.on("region-updated", (region) => {
      if (region.id !== LOOP_REGION_ID) return;
      const st = useTimelineStore.getState();
      const m = getActiveMix(st.mixes, st.activeMixId);
      if (!m) return;

      if (isCompositeMix(m)) {
        const tracks = m.tracks;
        const idx = st.activeTrackIndex;
        const g0 = trackFileToGlobal(tracks, idx, region.start);
        const g1 = trackFileToGlobal(tracks, idx, region.end);
        setLoopRegion(Math.min(g0, g1), Math.max(g0, g1));
        return;
      }

      const tr = m.tracks[0];
      if (!tr) return;
      const local0 = danceFileToLocal(tr, region.start);
      const local1 = danceFileToLocal(tr, region.end);
      setLoopRegion(Math.min(local0, local1), Math.max(local0, local1));
    });

    return () => {
      stopSegmentPoll();
      setIsReady(false);
      setWaveSurferInstance(null);
      loopRegionRef.current = null;
      regionsRef.current = null;
      wsRef.current = null;
      segmentBumpLockRef.current = false;
      ws.destroy();
    };
  }, [setAudioError, setCurrentTime, setIsPlaying, setLoopRegion]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !activeSrc) return;

    let cancelled = false;
    const seq = ++loadSeqRef.current;
    const switchingTrack =
      prevActiveSrcRef.current != null && prevActiveSrcRef.current !== activeSrc;
    prevActiveSrcRef.current = activeSrc;
    loadingSrcRef.current = activeSrc;
    setAudioError(null);
    setIsReady(false);
    setLoadedSrc(null);
    setTrackLoadBusy(true);
    useTimelineStore.getState().setFileDuration(0);
    suppressTimeSyncRef.current = true;
    clearWaveRegions();
    try {
      ws.empty();
    } catch {
      /* */
    }

    const autoResume = resumeAfterTrackLoadRef.current;
    const wasPlaying =
      autoResume || useTimelineStore.getState().isPlaying;
    if (switchingTrack && ws.isPlaying() && !autoResume) {
      void ws.pause();
    }

    const isStale = () => cancelled || seq !== loadSeqRef.current;

    const playAfterTrackLoad = () => {
      const media = ws.getMediaElement();
      return ws.play().catch(() => {
        if (!media) throw new Error("no media element");
        return new Promise<void>((resolve, reject) => {
          const attempt = () => {
            void ws.play().then(resolve).catch(reject);
          };
          if (media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            attempt();
          } else {
            media.addEventListener("canplay", () => attempt(), { once: true });
          }
        });
      });
    };

    const releaseAfterLoad = () => {
      resumeAfterTrackLoadRef.current = false;
      suppressTimeSyncRef.current = false;
    };

    const applyAfterDecode = () => {
      if (isStale()) {
        resumeAfterTrackLoadRef.current = false;
        suppressTimeSyncRef.current = false;
        setTrackLoadBusy(false);
        return;
      }
      setTrackLoadBusy(false);
      setAudioError(null);
      const st = useTimelineStore.getState();
      const m = getActiveMix(st.mixes, st.activeMixId);
      const tr = m ? activeTrack(m, st.activeTrackIndex) : undefined;
      if (!m || !tr || tr.src !== activeSrc) {
        releaseAfterLoad();
        return;
      }

      let ft = st.pendingFileSeek;
      if (ft == null) {
        ft = isCompositeMix(m)
          ? tr.segmentStart
          : danceLocalToFile(tr, st.currentTime);
      }
      ws.setTime(ft);
      st.clearPendingFileSeek();

      if (isCompositeMix(m)) {
        st.setCurrentTime(trackFileToGlobal(m.tracks, st.activeTrackIndex, ft));
      } else {
        st.setCurrentTime(danceFileToLocal(tr, ft));
      }

      const decoded = ws.getDuration();
      if (Number.isFinite(decoded) && decoded > 0) {
        st.setFileDuration(decoded);
        if (!isCompositeMix(m)) {
          st.setActiveTrackWindow(0, decoded);
        }
      }
      setLoadedSrc(activeSrc);
      setIsReady(true);
      segmentBumpLockRef.current = false;
      st.setAudioError(null);

      if (wasPlaying) {
        setIsPlaying(true);
        void playAfterTrackLoad()
          .then(releaseAfterLoad)
          .catch(() => {
            releaseAfterLoad();
            setIsPlaying(false);
          });
      } else {
        releaseAfterLoad();
      }
    };

    ws
      .load(activeSrc)
      .then(() => {
        if (isStale()) return;
        applyAfterDecode();
      })
      .catch((error: unknown) => {
        if (isStale()) return;
        if (isBenignLoadError(error)) return;
        const st = useTimelineStore.getState();
        const m = getActiveMix(st.mixes, st.activeMixId);
        const active = m ? activeTrack(m, st.activeTrackIndex)?.src : undefined;
        if (active !== activeSrc) return;
        resumeAfterTrackLoadRef.current = false;
        suppressTimeSyncRef.current = false;
        setTrackLoadBusy(false);
        setIsReady(false);
        setLoadedSrc(null);
        setAudioError(activeSrc);
        st.setFileDuration(0);
        try {
          ws.empty();
        } catch {
          /* */
        }
      });

    return () => {
      cancelled = true;
      if (loadingSrcRef.current === activeSrc) {
        loadingSrcRef.current = null;
      }
    };
  }, [activeSrc, setAudioError, setCurrentTime, setIsPlaying, setTrackLoadBusy]);

  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions || !mixIsReady || !mix) return;

    if (!loopRegion) {
      try {
        loopRegionRef.current?.remove();
      } catch {
        /* */
      }
      loopRegionRef.current = null;
      return;
    }

    let mapped: { start: number; end: number } | null = null;
    if (composite && track) {
      mapped = globalLoopToFileRegion(
        mix.tracks,
        activeTrackIndex,
        loopRegion.start,
        loopRegion.end,
      );
    } else if (track) {
      mapped = loopRegionToFile(track, loopRegion.start, loopRegion.end);
    }

    if (!mapped) {
      try {
        loopRegionRef.current?.remove();
      } catch {
        /* */
      }
      loopRegionRef.current = null;
      return;
    }

    const color = loopRegion.enabled
      ? cssVar("--loop-active", "rgba(245, 158, 11, 0.28)")
      : cssVar("--loop-inactive", "rgba(120, 113, 108, 0.2)");
    try {
      if (!loopRegionRef.current) {
        loopRegionRef.current = regions.addRegion({
          id: LOOP_REGION_ID,
          start: mapped.start,
          end: mapped.end,
          color,
          drag: true,
          resize: true,
        });
      } else {
        loopRegionRef.current.setOptions({
          start: mapped.start,
          end: mapped.end,
          color,
        });
      }
    } catch {
      try {
        loopRegionRef.current?.remove();
      } catch {
        /* */
      }
      loopRegionRef.current = regions.addRegion({
        id: LOOP_REGION_ID,
        start: mapped.start,
        end: mapped.end,
        color,
        drag: true,
        resize: true,
      });
    }
  }, [loopRegion, mixIsReady, mix, composite, activeTrackIndex, track, activeSrc]);

  const hasMarkers = (mix?.markers.length ?? 0) > 0;
  const subtitle =
    mix && composite
      ? `${categoryLabel(mix.category)} · ${t("waveform.threeSongMix")}`
      : null;

  const showSegmentGuides =
    mixIsReady &&
    track &&
    fileDuration > 0 &&
    (track.segmentStart > 0.05 ||
      track.segmentEnd < fileDuration - 0.05);
  const segmentStartPct = track
    ? (track.segmentStart / fileDuration) * 100
    : 0;
  const segmentEndPct = track ? (track.segmentEnd / fileDuration) * 100 : 100;

  return (
    <div
      className="overflow-hidden rounded-2xl px-3 py-4 shadow-lg shadow-black/25 ring-1 ring-stone-700/50 sm:px-5 sm:py-5"
      style={{
        background: "var(--player-surface)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
      }}
    >
      {composite && mixIsReady ? <TransitionStrip /> : null}

      <div className={`min-w-0 ${composite && mixIsReady ? "mt-4" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-stone-100">
            {mix?.name ?? "—"}
          </p>
          {subtitle ? (
            <span className="shrink-0 rounded-full bg-stone-800/80 px-2 py-0.5 text-[10px] text-stone-400 ring-1 ring-stone-700/60">
              {subtitle}
            </span>
          ) : null}
        </div>
        {composite && track && mixIsReady ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-text)] ring-1 ring-[var(--accent-ring)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
            {track.name}
          </p>
        ) : null}
      </div>

      {hasMarkers && mixIsReady ? (
        <div className="mt-4">
          <TimelineMarkers />
        </div>
      ) : null}

      <div
        className={`relative w-full ${hasMarkers && mixIsReady ? "mt-2" : "mt-4"}`}
        style={{ minHeight: `${WAVE_HEIGHT + 24}px` }}
      >
        <div
          ref={containerRef}
          className={`w-full transition-opacity ${
            mixIsReady ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!mixIsReady}
        />
        {showSegmentGuides ? (
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
            aria-hidden
          >
            <div
              className="absolute inset-y-0 left-0 bg-stone-950/35"
              style={{ width: `${segmentStartPct}%` }}
            />
            <div
              className="absolute inset-y-0 bg-stone-950/35"
              style={{
                left: `${segmentEndPct}%`,
                right: 0,
              }}
            />
            <div
              className="absolute inset-y-0 w-px bg-[var(--melodia-red)]/55"
              style={{ left: `${segmentStartPct}%` }}
            />
            <div
              className="absolute inset-y-0 w-px bg-[var(--melodia-red)]/55"
              style={{ left: `${segmentEndPct}%` }}
            />
            <div
              className="absolute inset-y-0 border-x border-[var(--melodia-copper)]/20"
              style={{
                left: `${segmentStartPct}%`,
                width: `${segmentEndPct - segmentStartPct}%`,
              }}
            />
          </div>
        ) : null}
        {isLoadingMusic ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-lg bg-stone-950/55 px-4 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="h-7 w-7 animate-spin text-[var(--accent)]"
              aria-hidden
            />
            <p className="text-sm font-medium text-stone-200">
              {t("waveform.gettingReady")}
            </p>
            <p className="text-center text-[11px] text-stone-500">
              {mix?.name ?? "Mix"}
            </p>
          </div>
        ) : null}
        {showLoadError ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-center"
            role="alert"
          >
            <Music2 className="h-6 w-6 text-stone-500" aria-hidden />
            <p className="text-sm font-medium text-stone-200">
              {t("audioError.title")}
            </p>
            <p className="max-w-xs text-[11px] leading-relaxed text-stone-500">
              {t("audioError.hintBefore")}{" "}
              <span className="font-mono text-stone-400">
                {publicAudioPath(audioError!)}
              </span>
              {t("audioError.hintAfter")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function publicAudioPath(src: string): string {
  const path = src.startsWith("/") ? src : `/${src}`;
  return `public${path}`;
}

function isBenignLoadError(error: unknown): boolean {
  if (!error) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const name = error instanceof Error ? error.name : "";
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    name === "AbortError" ||
    msg.includes("abort") ||
    msg.includes("aborted")
  );
}
