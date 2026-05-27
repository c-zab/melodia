"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_LOCALE,
  format,
  getMessages,
  type Locale,
  type Messages,
} from "@/lib/i18n";

const STORAGE_KEY = "melodia.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "en" || raw === "es") return raw;
  } catch {
    /* */
  }
  return DEFAULT_LOCALE;
}

function resolvePath(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setHydrated(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* */
    }
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = resolvePath(messages, key) ?? key;
      return vars ? format(template, vars) : template;
    },
    [messages],
  );

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = locale;
  }, [locale, hydrated]);

  const value = useMemo(
    () => ({ locale, setLocale, messages, t }),
    [locale, setLocale, messages, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
