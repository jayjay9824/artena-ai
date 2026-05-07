"use client";
import { useCallback, useState } from "react";
import { useLanguage } from "../../i18n/useLanguage";
import type { LabelTranslation, LangCode } from "../types/labelTranslation";

/**
 * STEP 4 — React surface for label translation.
 *
 *   translate(text, sourceLang?)  Fetches via /api/translate-label.
 *   toggleOriginal()              Flips between Original ⟷ Translated.
 *   displayed                     The string the UI should render now.
 *   needsToggle                   false when source equals target;
 *                                 the View Original button hides itself.
 *   reset()                       Clears state for a new scan.
 *
 * The toggle state lives in this hook — components that render the
 * translated label and the toggle button share one source of truth.
 */

interface State {
  loading:      boolean;
  result:       LabelTranslation | null;
  showOriginal: boolean;
  error:        string | null;
}

const INITIAL: State = { loading: false, result: null, showOriginal: false, error: null };

export function useLabelTranslation() {
  const { lang } = useLanguage();
  const [state, setState] = useState<State>(INITIAL);

  const translate = useCallback(async (text: string, sourceLang?: LangCode) => {
    if (!text || !text.trim()) return;
    setState({ loading: true, result: null, showOriginal: false, error: null });
    try {
      const res = await fetch("/api/translate-label", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text, target: lang, source: sourceLang }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "translation failed");
      setState({
        loading:      false,
        result:       json.data as LabelTranslation,
        showOriginal: false,
        error:        null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "translation failed";
      setState({ loading: false, result: null, showOriginal: false, error: msg });
    }
  }, [lang]);

  const toggleOriginal = useCallback(() => {
    setState(s => ({ ...s, showOriginal: !s.showOriginal }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const result       = state.result;
  const needsToggle  = !!result
                       && result.translatedText !== ""
                       && result.originalLang !== result.targetLang;
  const displayed    = !result
                       ? ""
                       : (state.showOriginal || !needsToggle)
                         ? result.originalText
                         : result.translatedText;

  return {
    loading:      state.loading,
    error:        state.error,
    result,
    needsToggle,
    showOriginal: state.showOriginal,
    displayed,
    translate,
    toggleOriginal,
    reset,
  };
}
