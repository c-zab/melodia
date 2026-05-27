"use client";

import { LOCALES } from "@/lib/i18n";
import { useLocale } from "@/hooks/useLocale";

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className="inline-flex shrink-0 rounded-lg bg-stone-900/90 p-0.5 ring-1 ring-stone-700/80"
      role="group"
      aria-label={t("common.language")}
    >
      {LOCALES.map(({ id, label }) => {
        const active = locale === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLocale(id)}
            aria-pressed={active}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
              active
                ? "bg-[var(--accent-muted)] text-[var(--accent-text)] ring-1 ring-[var(--accent-ring)]"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
