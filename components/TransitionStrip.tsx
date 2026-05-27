"use client";

import { useLocale } from "@/hooks/useLocale";
import { rehearsalDuration } from "@/lib/rehearsal";
import { getActiveMix, isCompositeMix } from "@/lib/mix";
import { useTimelineStore } from "@/store/useTimelineStore";

/** Bolivian flag arcs + logo ring: red · gold · green */
const SEGMENT_TINT = [
  "bg-gradient-to-br from-[color-mix(in_srgb,var(--melodia-red)_38%,transparent)] to-[color-mix(in_srgb,var(--melodia-red)_12%,transparent)] ring-[var(--melodia-red)]/55 shadow-sm shadow-black/30",
  "bg-gradient-to-br from-[color-mix(in_srgb,var(--melodia-gold)_35%,transparent)] to-[color-mix(in_srgb,var(--melodia-gold)_10%,transparent)] ring-[var(--melodia-gold)]/50 shadow-sm shadow-black/25",
  "bg-gradient-to-br from-[color-mix(in_srgb,var(--melodia-green)_32%,transparent)] to-[color-mix(in_srgb,var(--melodia-green)_10%,transparent)] ring-[var(--melodia-green)]/50 shadow-sm shadow-black/25",
];

export default function TransitionStrip() {
  const { t } = useLocale();
  const mixes = useTimelineStore((s) => s.mixes);
  const activeMixId = useTimelineStore((s) => s.activeMixId);
  const activeTrackIndex = useTimelineStore((s) => s.activeTrackIndex);
  const jumpToTrack = useTimelineStore((s) => s.jumpToTrack);

  const mix = getActiveMix(mixes, activeMixId);
  if (!mix || !isCompositeMix(mix)) return null;

  const tracks = mix.tracks;
  const total = rehearsalDuration(tracks);
  if (tracks.length === 0 || total <= 0) return null;

  return (
    <div className="space-y-1.5 border-b border-stone-800/50 pb-4">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-stone-500">
        <span>{t("transition.mixBlocks")}</span>
        <span className="font-mono normal-case text-stone-400">
          {t("transition.songsTotal", {
            count: tracks.length,
            total: formatShort(total),
          })}
        </span>
      </div>
      <div className="flex h-12 w-full gap-1.5 overflow-hidden rounded-xl bg-stone-950/60 p-1 ring-1 ring-stone-800/60">
        {tracks.map((tr, i) => {
          const len = Math.max(0.1, tr.segmentEnd - tr.segmentStart);
          const flex = Math.max(0.15, len / total);
          const isActive = i === activeTrackIndex;
          const tint = SEGMENT_TINT[i % SEGMENT_TINT.length];
          return (
            <button
              key={tr.id}
              type="button"
              onClick={() => jumpToTrack(i)}
              style={{ flex }}
              className={`min-w-0 rounded-lg px-2 py-1.5 text-left ring-1 transition ${
                isActive
                  ? tint
                  : "bg-stone-800/80 ring-stone-700/70 hover:bg-stone-800 hover:ring-stone-600"
              }`}
            >
              <span className="block truncate text-[11px] font-semibold text-stone-100">
                {tr.name}
              </span>
              <span className="mt-0.5 block font-mono text-[9px] text-stone-400">
                {formatShort(tr.segmentStart)}–{formatShort(tr.segmentEnd)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
