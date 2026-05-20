"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {
  type Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";

import {
  clamp,
  globalLoopToFileRegion,
  loopRestartGlobalTime,
  trackFileToGlobal,
} from "@/lib/rehearsal";
import { getWaveSurferInstance, setWaveSurferInstance } from "@/lib/wavesurfer";
import { useTimelineStore } from "@/store/useTimelineStore";
import TimelineMarkers from "./TimelineMarkers";
import TransitionStrip from "./TransitionStrip";

const LOOP_REGION_ID = "loop-region";
const SEGMENT_PLAY_REGION_ID = "segment-play";
const LOOP_COLOR_ACTIVE = "rgba(139, 92, 246, 0.24)";
const LOOP_COLOR_INACTIVE = "rgba(100, 116, 139, 0.18)";
const SEGMENT_PLAY_COLOR = "rgba(6, 182, 212, 0.16)";

/** Fire auto-advance slightly before the out-point so the next buffer can decode before the hard cut. */
const SEGMENT_END_LEAD_SECONDS = 0.12;

export default function WaveformPlayer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const loopRegionRef = useRef<Region | null>(null);
  const segmentPlayRegionRef = useRef<Region | null>(null);
  const segmentBumpLockRef = useRef(false);
  /** After auto-advance, `ws.load()` pauses the element before our `play()` — store may already show paused. */
  const resumeAfterTrackLoadRef = useRef(false);
  /** Src passed to the latest `ws.load()` — ignore errors from abandoned loads. */
  const loadingSrcRef = useRef<string | null>(null);
  /** Ignore timeupdate while the previous file is still attached. */
  const suppressTimeSyncRef = useRef(false);
  const prevActiveSrcRef = useRef<string | null>(null);

  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const pendingFileSeek = useTimelineStore((s) => s.pendingFileSeek);
  const track = useTimelineStore(
    (s) => s.project.tracks[s.activeTrackIndex] ?? s.project.tracks[0],
  );
  const loopRegion = useTimelineStore((s) => s.project.loopRegion);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const setAudioError = useTimelineStore((s) => s.setAudioError);
  const setLoopRegion = useTimelineStore((s) => s.setLoopRegion);
  const setTrackLoadBusy = useTimelineStore((s) => s.setTrackLoadBusy);
  const audioError = useTimelineStore((s) => s.audioError);

  const [isReady, setIsReady] = useState(false);

  const activeSrc = useTimelineStore((s) => {
    const tr = s.project.tracks[s.activeTrackIndex];
    return tr?.src ?? "";
  });

  useEffect(() => {
    if (pendingFileSeek == null || !isReady) return;
    const ws = getWaveSurferInstance();
    if (!ws) return;
    ws.setTime(pendingFileSeek);
    useTimelineStore.getState().clearPendingFileSeek();
  }, [pendingFileSeek, isReady]);

  /** One WaveSurfer for the app lifetime of this screen — avoids tearing down the audio graph on every song change. */
  useEffect(() => {
    if (!containerRef.current || wsRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const timeline = TimelinePlugin.create({
      height: 18,
      insertPosition: "beforebegin",
      primaryLabelInterval: 10,
      style: {
        color: "rgba(228, 228, 231, 0.45)",
        fontSize: "10px",
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      },
    });

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#475569",
      progressColor: "#22d3ee",
      cursorColor: "#fafafa",
      cursorWidth: 2,
      height: 96,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      /** Softer vertical scale so quiet vs loud sections stay distinguishable. */
      barHeight: 0.62,
      dragToSeek: true,
      normalize: false,
      backend: "MediaElement",
      plugins: [regions, timeline],
    });

    wsRef.current = ws;
    setWaveSurferInstance(ws);
    setAudioError(null);

    const bumpToNextTrack = () => {
      if (segmentBumpLockRef.current) return;
      const st = useTimelineStore.getState();
      const tracks = st.project.tracks;
      const idx = st.activeTrackIndex;
      const tr = tracks[idx];
      if (!tr || idx >= tracks.length - 1) return;
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
      st.seekRehearsal(nextGlobal);
    };

    const syncFromFileTime = (fileTime: number) => {
      if (suppressTimeSyncRef.current) return;
      const st = useTimelineStore.getState();
      const tracks = st.project.tracks;
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

      const loop = st.project.loopRegion;
      if (loop?.enabled && globalT >= loop.end - 0.05) {
        st.seekRehearsal(loopRestartGlobalTime(tracks, idx, loop.start));
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
      const tracks = st.project.tracks;
      const idx = st.activeTrackIndex;
      const tr = tracks[idx];
      if (!tr) return;
      const clamped = clamp(fileTime, tr.segmentStart, tr.segmentEnd);
      if (clamped !== fileTime) ws.setTime(clamped);
      st.setCurrentTime(trackFileToGlobal(tracks, idx, clamped));
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
      const idx = st.activeTrackIndex;
      const tr = st.project.tracks[idx];
      if (tr && idx < st.project.tracks.length - 1) {
        const endThreshold = tr.segmentEnd - SEGMENT_END_LEAD_SECONDS;
        if (ws.getCurrentTime() >= endThreshold - 0.05) {
          bumpToNextTrack();
          return;
        }
      }
      setIsPlaying(false);
    });
    ws.on("error", (error) => {
      console.error("[melodia] wavesurfer error", error);
      const src = loadingSrcRef.current;
      if (!src) return;
      const active =
        useTimelineStore.getState().project.tracks[
          useTimelineStore.getState().activeTrackIndex
        ]?.src;
      if (active !== src) return;
      setAudioError(
        `Couldn't load ${src}. Drop an MP3 at public${src} to begin.`,
      );
    });

    regions.on("region-updated", (region) => {
      if (region.id === SEGMENT_PLAY_REGION_ID) return;
      if (region.id !== LOOP_REGION_ID) return;
      const st = useTimelineStore.getState();
      const tracks = st.project.tracks;
      const idx = st.activeTrackIndex;
      const g0 = trackFileToGlobal(tracks, idx, region.start);
      const g1 = trackFileToGlobal(tracks, idx, region.end);
      setLoopRegion(Math.min(g0, g1), Math.max(g0, g1));
    });

    return () => {
      stopSegmentPoll();
      setIsReady(false);
      setWaveSurferInstance(null);
      loopRegionRef.current = null;
      segmentPlayRegionRef.current = null;
      regionsRef.current = null;
      wsRef.current = null;
      segmentBumpLockRef.current = false;
      ws.destroy();
    };
  }, [setAudioError, setCurrentTime, setIsPlaying, setLoopRegion]);

  /** Swap audio with `load()` only — keeps the same media element chain where possible, reducing clicks/gaps. */
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !activeSrc) return;

    let cancelled = false;
    const switchingTrack =
      prevActiveSrcRef.current != null && prevActiveSrcRef.current !== activeSrc;
    prevActiveSrcRef.current = activeSrc;
    loadingSrcRef.current = activeSrc;
    setAudioError(null);
    setIsReady(false);
    setTrackLoadBusy(true);
    suppressTimeSyncRef.current = true;

    const autoResume = resumeAfterTrackLoadRef.current;
    const wasPlaying =
      autoResume || useTimelineStore.getState().isPlaying;
    if (switchingTrack && ws.isPlaying() && !autoResume) {
      void ws.pause();
    }

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
      if (cancelled) {
        resumeAfterTrackLoadRef.current = false;
        segmentBumpLockRef.current = false;
        suppressTimeSyncRef.current = false;
        setTrackLoadBusy(false);
        return;
      }
      setTrackLoadBusy(false);
      setAudioError(null);
      const st = useTimelineStore.getState();
      const tracks = st.project.tracks;
      const idx = st.activeTrackIndex;
      const tinfo = tracks[idx];
      if (!tinfo) {
        releaseAfterLoad();
        return;
      }
      const ft = st.pendingFileSeek ?? tinfo.segmentStart;
      ws.setTime(ft);
      st.clearPendingFileSeek();
      setCurrentTime(trackFileToGlobal(tracks, idx, ft));
      const decoded = ws.getDuration();
      if (Number.isFinite(decoded) && decoded > 0) {
        st.setFileDuration(decoded);
      }
      setIsReady(true);
      segmentBumpLockRef.current = false;

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

    void ws
      .load(activeSrc)
      .then(applyAfterDecode)
      .catch((error: unknown) => {
        console.error("[melodia] load failed", error);
        segmentBumpLockRef.current = false;
        resumeAfterTrackLoadRef.current = false;
        suppressTimeSyncRef.current = false;
        setTrackLoadBusy(false);
        setIsReady(false);
        if (cancelled) return;
        const active =
          useTimelineStore.getState().project.tracks[
            useTimelineStore.getState().activeTrackIndex
          ]?.src;
        if (active !== activeSrc) return;
        setAudioError(
          `Couldn't load ${activeSrc}. Drop an MP3 at public${activeSrc} to begin.`,
        );
      });

    return () => {
      cancelled = true;
      segmentBumpLockRef.current = false;
      if (loadingSrcRef.current === activeSrc) {
        loadingSrcRef.current = null;
      }
    };
  }, [activeSrc, setAudioError, setCurrentTime, setIsPlaying, setTrackLoadBusy]);

  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions || !isReady) return;

    const st = useTimelineStore.getState();
    const tracks = st.project.tracks;
    const idx = st.activeTrackIndex;
    const loop = st.project.loopRegion;

    if (!loop) {
      if (loopRegionRef.current) {
        loopRegionRef.current.remove();
        loopRegionRef.current = null;
      }
      return;
    }

    const mapped = globalLoopToFileRegion(tracks, idx, loop.start, loop.end);
    if (!mapped) {
      if (loopRegionRef.current) {
        loopRegionRef.current.remove();
        loopRegionRef.current = null;
      }
      return;
    }

    const color = loop.enabled ? LOOP_COLOR_ACTIVE : LOOP_COLOR_INACTIVE;

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
  }, [loopRegion, isReady, activeTrackIndex]);

  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions || !isReady || !track) return;

    const start = track.segmentStart;
    const end = track.segmentEnd;
    if (!(end > start)) {
      if (segmentPlayRegionRef.current) {
        segmentPlayRegionRef.current.remove();
        segmentPlayRegionRef.current = null;
      }
      return;
    }

    if (!segmentPlayRegionRef.current) {
      segmentPlayRegionRef.current = regions.addRegion({
        id: SEGMENT_PLAY_REGION_ID,
        start,
        end,
        color: SEGMENT_PLAY_COLOR,
        drag: false,
        resize: false,
      });
    } else {
      segmentPlayRegionRef.current.setOptions({
        start,
        end,
        color: SEGMENT_PLAY_COLOR,
      });
    }
  }, [isReady, track, activeTrackIndex]);

  return (
    <div className="space-y-3">
      <TransitionStrip />
      <TimelineMarkers />
      <div className="relative rounded-xl bg-slate-900/70 px-3 py-3 ring-1 ring-slate-800/80 shadow-lg shadow-black/20 sm:px-4 sm:py-4">
        <div className="mb-2 space-y-0.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="truncate font-medium text-slate-300">{track?.name}</span>
            <span className="shrink-0 font-mono text-slate-500">
              in-file {formatClock(track?.segmentStart ?? 0)} –{" "}
              {formatClock(track?.segmentEnd ?? 0)}
            </span>
          </div>
          <p className="text-[10px] leading-snug text-slate-600">
            Full waveform = entire MP3.{" "}
            <span className="text-cyan-400/90">Cyan band</span> = rehearsal window for
            this block. Cues above sit on that window.
          </p>
        </div>
        <div ref={containerRef} className="w-full" />
        {!isReady && !audioError ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            Loading waveform…
          </div>
        ) : null}
        {audioError ? (
          <div className="mt-3 rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-xs text-red-300">
            {audioError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
