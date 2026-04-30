"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "../components/BottomNav";
import { useLanguage } from "../i18n/useLanguage";
import { getSavedCount } from "../utils/savedArtworks";

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
  const router = useRouter();
  const { t, lang, toggleLanguage } = useLanguage();

  // STEP 4 — count read through the savedArtworks util (single
  // source of truth, localStorage["axvela:savedArtworks"]). The
  // util migrates legacy collection_v1 data on first read so
  // returning users still see their existing saves. We re-read
  // on focus + visibilitychange so saving on another screen and
  // coming back here updates the count without a reload.
  const [savedCount, setSavedCount] = useState(0);

  const refreshCount = useCallback(() => {
    setSavedCount(getSavedCount());
  }, []);

  useEffect(() => {
    refreshCount();
    const onFocus     = () => refreshCount();
    const onVisChange = () => { if (!document.hidden) refreshCount(); };
    const onStorage   = (e: StorageEvent) => {
      if (!e.key || e.key === "axvela:savedArtworks") refreshCount();
    };
    window.addEventListener("focus",            onFocus);
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("storage",           onStorage);
    return () => {
      window.removeEventListener("focus",            onFocus);
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("storage",           onStorage);
    };
  }, [refreshCount]);

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

        {/* Saved count summary — STEP 1 (Profile card click fix).
            Card is a real <button>, never a <div>+onClick. The
            safety style block below disables Android Chrome's
            text-selection / Google search bottom-sheet that used
            to fire when users tapped the count text. Disabled at
            0 so empty profiles can't navigate into an empty
            Collection.
            Wrapper preserves the original 22px side margins; the
            button fills the remaining width with box-sizing so
            padding stays inside. */}
        <div style={{ padding: "0 22px" }}>
          <button
            type="button"
            onClick={() => router.push("/profile/saved")}
            disabled={savedCount === 0}
            aria-label={`저장한 작품 ${savedCount}개 보기`}
            style={{
              width:          "100%",
              padding:        "22px 22px",
              background:     "#FAFAF7",
              border:         "0.5px solid #ECEAE2",
              borderRadius:   16,
              display:        "flex",
              alignItems:     "baseline",
              justifyContent: "space-between",
              gap:            12,
              boxSizing:      "border-box" as const,
              textAlign:      "left" as const,
              cursor:         savedCount === 0 ? "default" : "pointer",
              opacity:        savedCount === 0 ? 0.5 : 1,
              fontFamily:     FONT,
              transition:     "background .12s, border-color .12s, opacity .12s",
              // Block Android Chrome's text-selection / Google
              // search bottom-sheet from firing on tap.
              userSelect:               "none",
              WebkitUserSelect:         "none",
              WebkitTouchCallout:       "none" as const,
              WebkitTapHighlightColor:  "transparent",
              touchAction:              "manipulation",
            }}
          >
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
          </button>
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
