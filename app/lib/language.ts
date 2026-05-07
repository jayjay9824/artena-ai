/**
 * Language storage utility — AXVELA key with legacy ARTENA fallback.
 *
 * Storage layout:
 *
 *   localStorage["axvela_lang"]      ← canonical (V3)
 *   localStorage["artena_language"]  ← legacy mirror, preserved on
 *                                      every write so older code paths
 *                                      that still read the old key
 *                                      keep working without extra
 *                                      coordination
 *   document.cookie  axvela_lang     ← server / SSR boundary fallback
 *                                      (1-year max-age, SameSite=Lax)
 *   <html lang>                      ← updated on every write so the
 *                                      DOM lang attribute reflects the
 *                                      active locale immediately
 *
 * Read order on first paint:
 *   1. axvela_lang   in localStorage    (new canonical)
 *   2. artena_language in localStorage  (legacy fallback)
 *   3. axvela_lang   cookie             (covers SSR / freshly cleared
 *                                        localStorage)
 *   4. default "ko"
 *
 * Anything that is not "ko" / "en" is treated as invalid and silently
 * ignored — the read falls through to the next source. The write
 * accepts only the strict union and the type system enforces it at
 * call sites.
 *
 * The i18n provider is intentionally NOT touched by this commit — it
 * will adopt these helpers in a later step. Both keys staying in sync
 * lets the swap happen without a flag day.
 */

export type Lang = "ko" | "en";

const LS_KEY_NEW    = "axvela_lang";
const LS_KEY_LEGACY = "artena_language";
const COOKIE_NAME   = "axvela_lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

export function readStoredLanguage(): Lang {
  if (typeof window === "undefined") return "ko";

  // 1. New canonical key.
  const fromNew = window.localStorage.getItem(LS_KEY_NEW);
  if (fromNew === "ko" || fromNew === "en") return fromNew;

  // 2. Legacy ARTENA key (read-only fallback — never written by step 2).
  const legacy = window.localStorage.getItem(LS_KEY_LEGACY);
  if (legacy === "ko" || legacy === "en") return legacy;

  // 3. Cookie — useful when localStorage was cleared but the cookie
  //    survived (private windows, partial clears, server hand-off).
  const match = document.cookie.match(/(?:^|;\s*)axvela_lang=([^;]+)/);
  if (match && (match[1] === "ko" || match[1] === "en")) {
    return match[1] as Lang;
  }

  // 4. Default — Korean is the primary surface language for AXVELA.
  return "ko";
}

export function writeLanguage(lang: Lang): void {
  if (typeof window === "undefined") return;

  // Reflect on <html lang> so the screen reader / browser locale
  // affordances pick the change up immediately.
  document.documentElement.lang = lang;

  // Cookie — long-lived, lax SameSite so it travels with same-site
  // navigations but not third-party iframes.
  document.cookie =
    `${COOKIE_NAME}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;

  // localStorage — write BOTH keys so legacy readers still see the
  // active language until they migrate to the new key.
  try {
    window.localStorage.setItem(LS_KEY_NEW, lang);
    window.localStorage.setItem(LS_KEY_LEGACY, lang);
  } catch {
    // Quota / blocked storage — silent. The cookie + <html lang>
    // already give us a usable signal until the next successful
    // write.
  }
}
