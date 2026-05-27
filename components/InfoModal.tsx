"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { HelpCircle, X } from "lucide-react";

import { useLocale } from "@/hooks/useLocale";
import { DANCE_MIX_GROUPS } from "@/lib/dances";
import { MARKER_CUE_LEAD_SECONDS, MARKER_META } from "@/lib/markers";

type InfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DANCE_DESC_KEYS: Record<
  string,
  "dances.morenadaDescription" | "dances.caporalesDescription"
> = {
  morenada: "dances.morenadaDescription",
  caporales: "dances.caporalesDescription",
};

export function InfoTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("common.helpAria")}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-stone-400 ring-1 ring-stone-700/70 transition hover:bg-stone-900/80 hover:text-stone-200 hover:ring-stone-600 sm:px-3 sm:text-xs"
    >
      <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      <span>{t("common.help")}</span>
    </button>
  );
}

export default function InfoModal({ open, onOpenChange }: InfoModalProps) {
  const { t } = useLocale();
  const cue = MARKER_META.cue;
  const note = MARKER_META.note;
  const CueIcon = cue.Icon;
  const NoteIcon = note.Icon;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(88vh,32rem)] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-stone-900 p-5 text-stone-100 shadow-2xl ring-1 ring-stone-700/80 focus:outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold sm:text-lg">
                {t("info.aboutTitle")}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-stone-400">
                {t("info.aboutDescription")}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label={t("common.close")}
              className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-5 text-sm text-stone-300">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t("info.danceCategories")}
              </h3>
              <ul className="mt-2 space-y-2">
                {DANCE_MIX_GROUPS.map((group) => (
                  <li
                    key={group.id}
                    className="rounded-lg bg-stone-800/60 px-3 py-2 ring-1 ring-stone-700/80"
                  >
                    <p className="font-medium text-stone-100">{group.label}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {t(DANCE_DESC_KEYS[group.id])}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-stone-500">
                {t("info.mixSelectorHint")}
              </p>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t("info.markers")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {t("info.markersIntroBefore")}{" "}
                <span className="font-medium text-stone-300">+</span>{" "}
                {t("info.markersIntroAfter")}
              </p>
              <ul className="mt-3 space-y-2">
                <li className="flex gap-3 rounded-lg bg-stone-800/60 px-3 py-2.5 ring-1 ring-stone-700/80">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${cue.tint}`}
                  >
                    <CueIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-stone-100">
                      {t("marker.cue")}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {t("info.cueIntro")}{" "}
                      <span className="font-medium text-stone-400">
                        {MARKER_CUE_LEAD_SECONDS}s {t("info.cueLeadSuffix")}
                      </span>{" "}
                      {t("info.cueMid")}{" "}
                      <span className="font-medium text-stone-400">
                        {t("info.hold")}
                      </span>{" "}
                      {t("info.cueOutro")}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-lg bg-stone-800/60 px-3 py-2.5 ring-1 ring-stone-700/80">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${note.tint}`}
                  >
                    <NoteIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-stone-100">
                      {t("marker.note")}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {t("info.noteDescription")}
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t("info.playback")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {t("info.playbackDescription")}
              </p>
            </section>
          </div>

          <div className="mt-6 flex justify-end">
            <Dialog.Close className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">
              {t("common.gotIt")}
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
