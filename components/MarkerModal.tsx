"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Activity, Bookmark, MessageSquare, Trash, X } from "lucide-react";

import { useTimelineStore, type MarkerType } from "@/store/useTimelineStore";
import { formatTime, seekToTime } from "@/lib/wavesurfer";

const MARKER_TYPES: { value: MarkerType; label: string; Icon: typeof Activity }[] =
  [
    { value: "comment", label: "Comment", Icon: MessageSquare },
    { value: "action", label: "Action", Icon: Activity },
    { value: "cue", label: "Cue", Icon: Bookmark },
  ];

export default function MarkerModal() {
  const isOpen = useTimelineStore((s) => s.isMarkerModalOpen);
  const closeMarkerModal = useTimelineStore((s) => s.closeMarkerModal);
  const marker = useTimelineStore(
    (s) =>
      s.project.markers.find((m) => m.id === s.selectedMarkerId) ?? null,
  );
  const updateMarker = useTimelineStore((s) => s.updateMarker);
  const deleteMarker = useTimelineStore((s) => s.deleteMarker);
  const steps = useTimelineStore((s) => s.project.steps);

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
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-zinc-900 p-5 text-zinc-100 shadow-2xl ring-1 ring-zinc-800 focus:outline-none sm:p-6"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {marker ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-base font-semibold sm:text-lg">
                    Edit marker
                  </Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-xs text-zinc-400">
                    Rehearsal {formatTime(marker.time)} ·{" "}
                    <button
                      type="button"
                      onClick={() => seekToTime(marker.time)}
                      className="text-violet-300 underline-offset-2 hover:underline"
                    >
                      jump to
                    </button>
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>

              <div className="mt-4 space-y-4">
                <Field label="Title">
                  <input
                    value={marker.title}
                    onChange={(event) =>
                      updateMarker(marker.id, { title: event.target.value })
                    }
                    placeholder="e.g. Levantar sombreros"
                    className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-700 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </Field>

                <Field label="Type">
                  <div className="grid grid-cols-3 gap-2">
                    {MARKER_TYPES.map(({ value, label, Icon }) => {
                      const isActive = marker.type === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateMarker(marker.id, { type: value })}
                          className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium ring-1 transition ${
                            isActive
                              ? "bg-violet-500/20 text-violet-100 ring-violet-400"
                              : "bg-zinc-800 text-zinc-400 ring-zinc-700 hover:text-zinc-100"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {steps.length > 0 ? (
                  <Field label="Step (paso)">
                    <select
                      value={marker.stepId ?? ""}
                      onChange={(event) =>
                        updateMarker(marker.id, {
                          stepId: event.target.value || null,
                        })
                      }
                      className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      <option value="">Sin clasificar</option>
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

                <Field label="Cue end (rehearsal sec, optional)">
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
                    placeholder="Window end — leave empty for a single hit"
                    className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-700 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Same clock as “Rehearsal” above. After start, optional end for a
                    timed segment inside the step.
                  </p>
                </Field>

                <Field label="Note">
                  <textarea
                    rows={3}
                    value={marker.note}
                    onChange={(event) =>
                      updateMarker(marker.id, { note: event.target.value })
                    }
                    placeholder="Add cues, formation notes, reminders…"
                    className="w-full resize-none rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-700 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
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
                  Delete
                </button>
                <button
                  type="button"
                  onClick={closeMarkerModal}
                  className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-violet-400"
                >
                  Done
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
