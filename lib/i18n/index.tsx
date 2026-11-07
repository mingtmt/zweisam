"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import vi, { type MessageKey } from "./vi";
import en from "./en";
import type { Locale } from "@/lib/types";

export type { MessageKey };
export const LOCALES: Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "vi";

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { vi, en };
const INTL_LOCALE: Record<Locale, string> = { vi: "vi-VN", en: "en-US" };
const STORAGE_KEY = "zweisam.locale";

// --- tiny external store over localStorage --------------------------------
const listeners = new Set<() => void>();
let override: Locale | null = null;

function isLocale(v: unknown): v is Locale {
  return v === "vi" || v === "en";
}

function readLocale(): Locale {
  if (override) return override;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // storage unavailable (private mode etc.)
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
  return nav.startsWith("en") ? "en" : DEFAULT_LOCALE;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setStoredLocale(locale: Locale) {
  override = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

// --- context ---------------------------------------------------------------
type Vars = Record<string, string | number>;

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  formatDateTime: (value: Date | number | string) => string;
  formatDate: (value: Date | number | string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => {
      const msg = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
      if (!vars) return msg;
      return msg.replace(/\{(\w+)\}/g, (_, k: string) =>
        k in vars ? String(vars[k]) : `{${k}}`
      );
    },
    [locale]
  );

  const value = useMemo<I18nValue>(() => {
    const dt = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    const d = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const safe = (f: Intl.DateTimeFormat) => (v: Date | number | string) => {
      const date = v instanceof Date ? v : new Date(v);
      return Number.isNaN(date.getTime()) ? "" : f.format(date);
    };
    return {
      locale,
      setLocale: setStoredLocale,
      t,
      formatDateTime: safe(dt),
      formatDate: safe(d),
    };
  }, [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Keeps the UI language in sync with the signed-in user's saved preference. */
export function LocaleSync({ locale }: { locale: Locale | undefined }) {
  // Apply only when the saved preference itself changes, so a local switch
  // isn't reverted while its Firestore write is still in flight.
  useEffect(() => {
    if (isLocale(locale) && locale !== readLocale()) setStoredLocale(locale);
  }, [locale]);
  return null;
}
