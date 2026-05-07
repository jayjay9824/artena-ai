"use client";
import React, { useEffect, useMemo } from "react";
import { useLabelTranslation } from "../hooks/useLabelTranslation";
import { useLanguage } from "../../i18n/useLanguage";
import { detectLang } from "../lib/detectLang";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

/**
 * STEP 4 — Inline translatable text + View Original toggle.
 *
 * Detects source language client-side; same-language passes render
 * the text verbatim with no API call (input != output spec rule).
 * When languages differ, fires /api/translate-label and exposes a
 * pill toggle to swap between the translated copy and the original
 * label.
 *
 * The hook's state is per-instance — multiple TranslatableText nodes
 * on a screen each maintain their own toggle state, which is the
 * usual museum-label UX.
 */
export function TranslatableText({
  text,
  style,
}: {
  text:   string;
  style?: React.CSSProperties;
}) {
  const { lang, t } = useLanguage();
  const { displayed, needsToggle, showOriginal, translate, toggleOriginal } = useLabelTranslation();

  const sourceLang = useMemo(() => detectLang(text), [text]);
  const skip       = sourceLang === lang || !text || !text.trim();

  useEffect(() => {
    if (skip) return;
    translate(text, sourceLang);
  }, [text, lang, sourceLang, skip, translate]);

  if (!text) return null;

  // While the translation is in flight, show the source text — no
  // flicker, no layout jump, no spinner over editorial copy.
  const shown = displayed || text;

  return (
    <>
      <span style={style}>{shown}</span>
      {needsToggle && (
        <span style={{ display: "block", marginTop: 8 }}>
          <button
            onClick={toggleOriginal}
            style={{
              background:    "none",
              border:        "0.5px solid #E7E2D8",
              borderRadius:  999,
              padding:       "3px 10px",
              fontSize:      9,
              color:         "#8A6A3F",
              letterSpacing: ".12em",
              fontFamily:    FONT,
              cursor:        "pointer",
              textTransform: "uppercase" as const,
              fontWeight:    600,
              transition:    "background .12s",
            }}
          >
            {showOriginal ? t("label.view_translated") : t("label.view_original")}
          </button>
        </span>
      )}
    </>
  );
}
