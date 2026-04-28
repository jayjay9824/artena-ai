"use client";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LanguageCode,
  SUPPORTED_LANGUAGES,
  translations,
} from "./translations";

/**
 * LanguageContext — global language state + t() resolver.
 *
 * Hydration policy:
 *   The server always renders DEFAULT_LANGUAGE ("ko"). On mount we
 *   read localStorage and switch if the user previously selected
 *   English. This causes a one-frame flash for English users on
 *   first paint — preferred over hydration mismatches that would
 *   throw warnings or require suppressHydrationWarning across the
 *   tree. (To eliminate the flash entirely, move language to a
 *   route segment or a cookie that the server can read.)
 */

export interface LanguageContextValue {
  /** Current active language. */
  lang: LanguageCode;
  /** Resolve a translation key with simple {placeholder} interpolation.
   *  Falls back to the ko dictionary, then to the raw key — UI never
   *  shows undefined. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Toggle ko ↔ en. */
  toggleLanguage: () => void;
  /** Set a specific language. */
  setLanguage: (next: LanguageCode) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguageCode(v: unknown): v is LanguageCode {
  return typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, key) => {
    const v = params[key];
    return v === undefined ? m : String(v);
  });
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguageCode(stored)) setLang(stored);
    } catch { /* private mode / disabled — silently ignore */ }
    setHydrated(true);
  }, []);

  // Persist on change. Skipped until hydrated so the initial default
  // doesn't clobber a stored preference.
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch {}
  }, [lang, hydrated]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const dict     = translations[lang]            ?? {};
    const fallback = translations[DEFAULT_LANGUAGE] ?? {};
    const raw      = dict[key] ?? fallback[key] ?? key;
    return interpolate(raw, params);
  }, [lang]);

  const toggleLanguage = useCallback(() => {
    setLang(prev => prev === "ko" ? "en" : "ko");
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    if (isLanguageCode(next)) setLang(next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, t, toggleLanguage, setLanguage }),
    [lang, t, toggleLanguage, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
