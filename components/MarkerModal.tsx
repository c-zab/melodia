"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Trash, X } from "lucide-react";

import { useLocale } from "@/hooks/useLocale";
import { getActiveMix } from "@/lib/mix";
import { MARKER_TYPE_OPTIONS } from "@/lib/markers";
import { useTimelineStore } from "@/store/useTimelineStore";
import { formatTime, seekToMarkerCue } from "@/lib/wavesurfer";

export default function MarkerModal() {
  const { t } = useLocale();
  const isOpen = useTimelineStore((s) => s.isMarkerModalOpen);
  const closeMarkerModal = useTimelineStore((s) => s.closeMarkerModal);
  const mixes = useTimelineStore((s) => s.mixes);
  const activeMixId = useTimelineStore((s) => s.activeMixId);
  const selectedMarkerId = useTimelineStore((s) => s.selectedMarkerId);
  const mix = getActiveMix(mixes, activeMixId);
  const marker =
    mix?.markers.find((m) => m.id === selectedMarkerId) ?? null;
  const updateMarker = useTimelineStore((s) => s.updateMarker);
  const deleteMarker = useTimelineStore((s) => s.deleteMarker);
  const steps = mix?.steps ?? [];

  const typeLabel = (type: "cue" | "note") =>
    type === "cue" ? t("marker.cue") : t("marker.note");

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeMarkerModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-stone-900 p-5 text-stone-100 shadow-2xl ring-1 ring-stone-800 focus:outline-none sm:p-6"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {marker ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-base font-semibold sm:text-lg">
                    {t("markerModal.title")}
                  </Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-xs text-stone-400">
                    {formatTime(marker.time)} ·{" "}
                    <button
                      type="button"
                      onClick={() => seekToMarkerCue(marker.time)}
                      className="text-[var(--melodia-copper-light)] underline-offset-2 hover:underline"
                    >
                      {t("markerModal.jumpTo")}
                    </button>
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label={t("common.close")}
                  className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                >
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>

              <div className="mt-4 space-y-4">
                <Field label={t("markerModal.fieldTitle")}>
                  <input
                    value={marker.title}
                    onChange={(event) =>
                      updateMarker(marker.id, { title: event.target.value })
                    }
                    placeholder={t("markerModal.titlePlaceholder")}
                    className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 ring-1 ring-stone-700 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </Field>

                <Field label={t("markerModal.fieldType")}>
                  <div className="grid grid-cols-2 gap-2">
                    {MARKER_TYPE_OPTIONS.map(({ value, Icon }) => {
                      const isActive = marker.type === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateMarker(marker.id, { type: value })}
                          className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium ring-1 transition ${
                            isActive
                              ? "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-[var(--accent-ring)]"
                              : "bg-stone-800 text-stone-400 ring-stone-700 hover:text-stone-100"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {typeLabel(value)}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {steps.length > 0 ? (
                  <Field label={t("markerModal.fieldStep")}>
                    <select
                      value={marker.stepId ?? ""}
                      onChange={(event) =>
                        updateMarker(marker.id, {
                          stepId: event.target.value || null,
                        })
                      }
                      className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 ring-1 ring-stone-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                    >
                      <option value="">{t("markerModal.unclassified")}</option>
                      {[...steps]
                        .sort((a, b) => a.startTime - b.startTime)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} · {formatTime(s.startTime)}
                          </option>
                        ))}
                    </select>
                  </Field>
                ) : null}

                <Field label={t("markerModal.cueEnd")}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={marker.time + 0.1}
                    step={0.25}
                    value={
                      marker.cueEndTime != null ? String(marker.cueEndTime) : ""
                    }
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      if (raw === "") {
                        updateMarker(marker.id, { cueEndTime: null });
                        return;
                      }
                      const n = Number(raw);
                      if (!Number.isFinite(n) || n <= marker.time) return;
                      updateMarker(marker.id, { cueEndTime: n });
                    }}
                    placeholder={t("markerModal.cueEndPlaceholder")}
                    className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 ring-1 ring-stone-700 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                  <p className="mt-1 text-[10px] text-stone-600">
                    {t("markerModal.cueEndHint")}
                  </p>
                </Field>

                <Field label={t("markerModal.fieldNote")}>
                  <textarea
                    rows={3}
                    value={marker.note}
                    onChange={(event) =>
                      updateMarker(marker.id, { note: event.target.value })
                    }
                    placeholder={t("markerModal.notePlaceholder")}
                    className="w-full resize-none rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100 ring-1 ring-stone-700 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </Field>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => deleteMarker(marker.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash className="h-4 w-4" />
                  {t("common.delete")}
                </button>
                <button
                  type="button"
                  onClick={closeMarkerModal}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  {t("common.done")}
                </button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-stone-500">
        {label}
      </span>
      {children}
    </label>
  );
}
