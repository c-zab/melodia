"use client";

import { Activity, Bookmark, MessageSquare } from "lucide-react";

import { markerGlobalToFileInTrack } from "@/lib/rehearsal";
import { formatMmSs } from "@/lib/timeFormat";
import { seekToTime } from "@/lib/wavesurfer";
import { useTimelineStore, type Marker, type MarkerType } from "@/store/useTimelineStore";

const MARKER_ICON: Record<MarkerType, typeof Activity> = {
  comment: MessageSquare,
  action: Activity,
  cue: Bookmark,
};

const MARKER_TINT: Record<MarkerType, string> = {
  comment: "text-sky-200 bg-sky-500/15 ring-sky-400/40",
  action: "text-cyan-100 bg-cyan-500/15 ring-cyan-400/45",
  cue: "text-amber-200 bg-amber-500/15 ring-amber-400/40",
};

const MARKER_PIN: Record<MarkerType, string> = {
  comment: "bg-sky-400/70",
  action: "bg-cyan-400/80",
  cue: "bg-amber-400/70",
};

export default function TimelineMarkers() {
  const markers = useTimelineStore((s) => s.project.markers);
  const tracks = useTimelineStore((s) => s.project.tracks);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const fileDuration = useTimelineStore((s) => s.fileDuration);
  const openMarkerModal = useTimelineStore((s) => s.openMarkerModal);

  const visible =
    fileDuration > 0
      ? markers
          .map((m) => {
            const fileT = markerGlobalToFileInTrack(
              tracks,
              activeTrackIndex,
              m.time,
            );
            return fileT === null ? null : { marker: m, fileT };
          })
          .filter((x): x is { marker: Marker; fileT: number } => x !== null)
      : [];

  return (
    <div className="px-3 sm:px-4">
      <div className="relative h-10 w-full">
        {fileDuration <= 0 ? (
          <div className="flex h-full items-center text-[11px] text-slate-600">
            Load audio to place cues on the waveform…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex h-full items-center text-[11px] text-slate-600">
            No cues in this block yet — add markers while this song is active, or
            switch blocks to see other cues.
          </div>
        ) : (
          visible.map(({ marker, fileT }) => {
            const Icon = MARKER_ICON[marker.type];
            const position = (fileT / fileDuration) * 100;
            return (
              <button
                key={marker.id}
                type="button"
                onClick={() => {
                  seekToTime(marker.time);
                  openMarkerModal(marker.id);
                }}
                style={{ left: `${position}%` }}
                className="group absolute top-0 -translate-x-1/2 flex flex-col items-center focus:outline-none"
                title={`${marker.title} · file ${formatMmSs(fileT)} · rehearsal ${formatMmSs(marker.time)}`}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-md p-1 ring-1 transition-transform group-hover:scale-110 ${MARKER_TINT[marker.type]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`mt-0.5 h-3 w-px ${MARKER_PIN[marker.type]}`}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
