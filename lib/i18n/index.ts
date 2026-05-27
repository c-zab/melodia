import { en, type Messages } from "./locales/en";
import { es } from "./locales/es";

export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "es";

export const LOCALES: ReadonlyArray<{ id: Locale; label: string }> = [
  { id: "es", label: "ES" },
  { id: "en", label: "EN" },
];

const catalogs: Record<Locale, Messages> = { en, es };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

/** Replace `{key}` placeholders in a template string. */
export function format(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v != null ? String(v) : `{${key}}`;
  });
}

export type { Messages };
