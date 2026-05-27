"use client";

import { danceLocalToFile } from "@/lib/dance";
import { getActiveMix, isCompositeMix } from "@/lib/mix";
import {
  MARKER_CUE_LEAD_SECONDS,
  MARKER_META,
  markerIsJumpable,
} from "@/lib/markers";
import { formatMmSs } from "@/lib/timeFormat";
import { markerGlobalToFileInTrack } from "@/lib/rehearsal";
import { useLocale } from "@/hooks/useLocale";
import { useMarkerPress } from "@/hooks/useMarkerPress";
import { useTimelineStore } from "@/store/useTimelineStore";

export default function TimelineMarkers() {
  const { t } = useLocale();
  const mixes = useTimelineStore((s) => s.mixes);
  const activeMixId = useTimelineStore((s) => s.activeMixId);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const mix = getActiveMix(mixes, activeMixId);
  const markers = mix?.markers ?? [];
  const fileDuration = useTimelineStore((s) => s.fileDuration);
  if (markers.length === 0 || !mix) return null;

  const composite = isCompositeMix(mix);
  const tr = mix.tracks[activeTrackIndex] ?? mix.tracks[0];

  const visible =
    fileDuration > 0 && tr
      ? markers
          .map((m) => {
            const fileT = composite
              ? markerGlobalToFileInTrack(mix.tracks, activeTrackIndex, m.time)
              : danceLocalToFile(tr, m.time);
            return fileT != null ? { marker: m, fileT } : null;
          })
          .filter((x): x is { marker: (typeof markers)[0]; fileT: number } =>
            x != null,
          )
      : [];

  return (
    <div className="px-0.5 sm:px-1">
      <div className="relative h-12 w-full">
        {fileDuration <= 0 ? (
          <div className="flex h-full items-center text-[11px] text-stone-500">
            {t("timeline.loadAudio")}
          </div>
        ) : (
          visible.map(({ marker, fileT }) => {
            const { Icon, tint, pin } = MARKER_META[marker.type];
            const position = (fileT / fileDuration) * 100;
            const jumpable = markerIsJumpable(marker.type);
            const timeLabel = formatMmSs(marker.time);
            const pinBody = (
              <>
                <span
                  className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-md p-1.5 ring-1 ${tint} ${jumpable ? "transition-transform group-hover:scale-110 group-focus-visible:scale-110" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={`mt-0.5 h-3.5 w-px ${pin}`} />
              </>
            );

            if (!jumpable) {
              return (
                <div
                  key={marker.id}
                  style={{ left: `${position}%` }}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  title={t("marker.titleAtTime", {
                    title: marker.title,
                    time: timeLabel,
                  })}
                  aria-label={t("marker.atTimeNote", {
                    title: marker.title,
                    time: timeLabel,
                  })}
                >
                  {pinBody}
                </div>
              );
            }

            return (
              <CueMarkerPin
                key={marker.id}
                markerId={marker.id}
                markerTime={marker.time}
                title={marker.title}
                timeLabel={timeLabel}
                position={position}
              >
                {pinBody}
              </CueMarkerPin>
            );
          })
        )}
      </div>
    </div>
  );
}

function CueMarkerPin({
  markerId,
  markerTime,
  title,
  timeLabel,
  position,
  children,
}: {
  markerId: string;
  markerTime: number;
  title: string;
  timeLabel: string;
  position: number;
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
      style={{ left: `${position}%` }}
      className="group absolute top-0 flex min-h-11 min-w-11 -translate-x-1/2 touch-manipulation flex-col items-center justify-start rounded-md select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
      title={`${title} · ${timeLabel} — ${hint}`}
      aria-label={t("marker.titleAtTimeHint", {
        title,
        time: timeLabel,
        hint,
      })}
    >
      {children}
    </button>
  );
}
