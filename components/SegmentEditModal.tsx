"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/rehearsal";
import { formatMmSs, parseTimeToSeconds } from "@/lib/timeFormat";
import { useTimelineStore, type Track } from "@/store/useTimelineStore";

export default function SegmentEditModal() {
  const isOpen = useTimelineStore((s) => s.isTrackSegmentsModalOpen);
  const segmentEditTrackIndex = useTimelineStore(
    (s) => s.segmentEditTrackIndex,
  );
  const tracks = useTimelineStore((s) => s.project.tracks);
  const segmentsFormKey = useTimelineStore((s) => s.segmentsFormKey);
  const closeTrackSegmentsModal = useTimelineStore(
    (s) => s.closeTrackSegmentsModal,
  );

  const track =
    segmentEditTrackIndex != null ? tracks[segmentEditTrackIndex] : null;
  const dialogOpen = Boolean(isOpen && track);

  return (
    <Dialog.Root
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) closeTrackSegmentsModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        {track && segmentEditTrackIndex != null ? (
          <Dialog.Content
            key={segmentsFormKey}
            className="fixed left-1/2 top-1/2 z-[61] max-h-[90vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-zinc-900 p-5 text-zinc-100 shadow-2xl ring-1 ring-zinc-800 focus:outline-none sm:p-6"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <SegmentEditorBody
              trackIndex={segmentEditTrackIndex}
              track={track}
            />
          </Dialog.Content>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SegmentEditorBody({
  trackIndex,
  track,
}: {
  trackIndex: number;
  track: Track;
}) {
  const setTrackSegments = useTimelineStore((s) => s.setTrackSegments);
  const closeTrackSegmentsModal = useTimelineStore(
    (s) => s.closeTrackSegmentsModal,
  );

  const [startStr, setStartStr] = useState(() => formatMmSs(track.segmentStart));
  const [endStr, setEndStr] = useState(() => formatMmSs(track.segmentEnd));
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [fileLen, setFileLen] = useState(0);
  const [head, setHead] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setPlaying(false);
    setHead(0);
    setFileLen(0);
    a.src = track.src;
    a.load();

    const onMeta = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0) setFileLen(d);
    };
    const onTime = () => setHead(a.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    return () => {
      a.pause();
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeAttribute("src");
      a.load();
    };
  }, [track.src, track.id]);

  const seekPreview = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    const max = Number.isFinite(fileLen) && fileLen > 0 ? fileLen : 1e9;
    a.currentTime = clamp(t, 0, max);
    setHead(a.currentTime);
  }, [fileLen]);

  const skipPreview = useCallback(
    (delta: number) => {
      seekPreview(head + delta);
    },
    [head, seekPreview],
  );

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      void a.pause();
    } else {
      void a.play().catch(() => {});
    }
  }, [playing]);

  const applyPlaybackToStart = () => {
    setStartStr(formatMmSs(head));
    setError(null);
  };

  const applyPlaybackToEnd = () => {
    setEndStr(formatMmSs(head));
    setError(null);
  };

  const handleSave = () => {
    const a = parseTimeToSeconds(startStr);
    const b = parseTimeToSeconds(endStr);
    if (a === null || b === null) {
      setError("Use m:ss or seconds (e.g. 1:47 or 90).");
      return;
    }
    if (b <= a + 0.2) {
      setError("End must be after start.");
      return;
    }
    if (Number.isFinite(fileLen) && fileLen > 0 && b > fileLen + 0.5) {
      setError(`End is past this file (~${formatMmSs(fileLen)}).`);
      return;
    }
    setError(null);
    setTrackSegments([{ index: trackIndex, segmentStart: a, segmentEnd: b }]);
    closeTrackSegmentsModal();
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Dialog.Title className="text-base font-semibold sm:text-lg">
            {track.name}
          </Dialog.Title>
          <Dialog.Description className="mt-1 break-all font-mono text-[10px] text-zinc-500">
            {track.src}
          </Dialog.Description>
          <p className="mt-2 text-xs text-zinc-400">
            Preview the full file, then set in and out times for this rehearsal
            block.
          </p>
        </div>
        <Dialog.Close
          aria-label="Close"
          className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="h-5 w-5" />
        </Dialog.Close>
      </div>

      <audio ref={audioRef} preload="metadata" className="hidden" />

      <div className="mt-4 rounded-xl bg-zinc-800/80 p-3 ring-1 ring-zinc-700">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Preview
        </p>
        <div className="flex items-center justify-between gap-2 font-mono text-xs text-zinc-300">
          <span>{formatMmSs(head)}</span>
          {fileLen > 0 ? (
            <span className="text-zinc-500">/ {formatMmSs(fileLen)}</span>
          ) : (
            <span className="text-zinc-600">loading…</span>
          )}
        </div>
        {fileLen > 0 ? (
          <input
            type="range"
            min={0}
            max={fileLen}
            step={0.05}
            value={clamp(head, 0, fileLen)}
            onChange={(e) => seekPreview(Number(e.target.value))}
            className="mt-2 w-full accent-violet-500"
            aria-label="Preview position"
          />
        ) : null}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => skipPreview(-5)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800"
          >
            −5s
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause preview" : "Play preview"}
            className="grid h-12 w-12 place-items-center rounded-full bg-violet-500 text-zinc-950 ring-2 ring-violet-400/40 hover:bg-violet-400"
          >
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => skipPreview(5)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800"
          >
            +5s
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Start in file
            </span>
            <input
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 px-2.5 py-2 font-mono text-sm text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="0:00"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              End in file
            </span>
            <input
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 px-2.5 py-2 font-mono text-sm text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="2:09"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyPlaybackToStart}
            className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 ring-1 ring-zinc-600 hover:bg-zinc-700"
          >
            Use playback time → start
          </button>
          <button
            type="button"
            onClick={applyPlaybackToEnd}
            className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 ring-1 ring-zinc-600 hover:bg-zinc-700"
          >
            Use playback time → end
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Dialog.Close asChild>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Cancel
          </button>
        </Dialog.Close>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-violet-400"
        >
          Save block
        </button>
      </div>
    </>
  );
}
