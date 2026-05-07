"use client";
import { useContext } from "react";
import { LanguageContext, LanguageContextValue } from "./LanguageProvider";

/**
 * Hook for consuming the LanguageContext anywhere under
 * <LanguageProvider />. Throws on misuse so missing providers fail
 * loudly during development instead of silently rendering keys.
 *
 * Usage:
 *   const { t, lang, toggleLanguage } = useLanguage();
 *   <h1>{t("home.headline")}</h1>
 *   <p>{t("taste.based_on", { n: 12 })}</p>
 *   <button onClick={toggleLanguage}>{lang === "ko" ? "EN" : "KO"}</button>
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider />");
  return ctx;
}
