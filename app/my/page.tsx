"use client";
import React from "react";
import { useMyActivity } from "../context/MyActivityContext";
import { useCollection } from "../collection/hooks/useCollection";
import { BottomNav } from "../components/BottomNav";
import { useLanguage } from "../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * PART 4 — minimal Profile.
 *
 * Three blocks only: header, saved-count summary, language setting.
 * Tabs / likes / collections / recent views are gone from the surface
 * but the underlying MyActivity state is preserved (legacy paths
 * still write into it). Profile must not compete with Scan.
 */
function MyPage() {
  const { state } = useMyActivity();
  const { items: analysisItems } = useCollection();
  const { t, lang, toggleLanguage } = useLanguage();

  // Saved = anything the user has stored in Collection (analysis or
  // gallery-saved). Single concept; no Like / Save split per spec.
  const savedCount = (() => {
    const ids = new Set<string>();
    for (const a of analysisItems) ids.add(a.id);
    for (const s of state.saved)   ids.add(s.artwork_id);
    return ids.size;
  })();

  return (
    <>
      <div style={{
        background:    "#FFFFFF",
        minHeight:     "100vh",
        maxWidth:      640,
        margin:        "0 auto",
        fontFamily:    FONT,
        paddingBottom: 120,
        boxSizing:     "border-box" as const,
      }}>
        {/* Header */}
        <div style={{ padding: "62px 22px 28px" }}>
          <a
            href="/"
            style={{
              display:        "inline-block",
              fontSize:       9,
              color:          "#8A6A3F",
              letterSpacing:  "0.22em",
              textTransform:  "uppercase" as const,
              margin:         "0 0 12px",
              textDecoration: "none",
              fontFamily:     FONT,
            }}
          >
            {t("common.app_name")}
          </a>
          <h1 style={{
            fontSize:      28,
            fontWeight:    700,
            margin:        "0 0 4px",
            fontFamily:    FONT_HEAD,
            letterSpacing: "-0.025em",
            color:         "#0D0D0D",
            lineHeight:    1.1,
          }}>
            {t("profile.title")}
          </h1>
          <p style={{
            fontSize:      12,
            color:         "#AAAAAA",
            margin:        0,
            letterSpacing: "0.01em",
          }}>
            {t("profile.tagline")}
          </p>
        </div>

        {/* Saved count summary */}
        <div style={{
          margin:         "0 22px",
          padding:        "22px 22px",
          background:     "#FAFAF7",
          border:         "0.5px solid #ECEAE2",
          borderRadius:   16,
          display:        "flex",
          alignItems:     "baseline",
          justifyContent: "space-between",
          gap:            12,
        }}>
          <span style={{
            fontSize:      11,
            color:         "#8A6A3F",
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            fontWeight:    600,
          }}>
            {t("profile.saved_count")}
          </span>
          <span style={{
            fontSize:           28,
            fontWeight:         700,
            color:              "#0D0D0D",
            fontFamily:         FONT_HEAD,
            letterSpacing:      "-0.02em",
            fontVariantNumeric: "tabular-nums" as const,
            lineHeight:         1,
          }}>
            {savedCount}
          </span>
        </div>

        {/* Settings — language only. Profile stays minimal. */}
        <div style={{ padding: "36px 22px 0" }}>
          <p style={{
            fontSize:      9,
            color:         "#9A9A9A",
            letterSpacing: "0.22em",
            textTransform: "uppercase" as const,
            margin:        "0 0 12px",
            fontWeight:    600,
          }}>
            {t("profile.language")}
          </p>
          <button
            onClick={toggleLanguage}
            aria-pressed={lang === "ko"}
            style={{
              padding:        "11px 20px",
              background:     "#FFFFFF",
              border:         "0.5px solid #D8D8D8",
              borderRadius:   999,
              fontSize:       12,
              fontWeight:     500,
              color:          "#0D0D0D",
              letterSpacing:  "0.06em",
              cursor:         "pointer",
              fontFamily:     FONT,
              transition:     "background .12s, border-color .12s",
            }}
          >
            {lang === "ko" ? "한국어 / English" : "English / 한국어"}
          </button>
        </div>
      </div>

      <BottomNav currentTab="my" />
    </>
  );
}

/** Named export preserved — analyze AppShell composes this directly. */
export { MyPage as MyPageContent };
export default MyPage;
