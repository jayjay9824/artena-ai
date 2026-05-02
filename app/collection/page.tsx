"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { useCollection, type CollectionItem } from "./hooks/useCollection";
import { useMyActivity } from "../context/MyActivityContext";
import { useTabNav } from "../context/TabContext";
import { QuickReport, type QRAnalysis } from "../analyze/components/QuickReport";
import type { MarketIntelligenceData } from "../analyze/components/MarketIntelligenceReport";
import { BottomNav } from "../components/BottomNav";
import { useLanguage } from "../i18n/useLanguage";
import { trackEvent } from "../services/tracking/trackEvent";
import { makeArtworkId } from "../analyze/lib/analytics";
import { hasAskHistory } from "../analyze/hooks/useAskHistory";

const FONT      = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * PART 4 — simplified Collection.
 *
 * One flat grid of saved artworks. No tabs, no sort, no taste signal,
 * no folders. Tap → reopens QuickReport for the analysis-sourced
 * record (existing flow). Underlying MyActivity / useCollection state
 * is preserved unchanged so legacy paths still work.
 */

interface FlatItem {
  id:        string;
  imageUrl:  string | null;
  artist:    string;
  title:     string;
  /** When present, tap opens the deep analysis. Gallery-only saves
   *  fall through to the scan tab (no analysis to open). */
  analysis?: CollectionItem;
}

function CollectionPage() {
  const { items: analysisItems } = useCollection();
  const { state: myState }       = useMyActivity();
  const { goTo }                 = useTabNav();
  const { t }                    = useLanguage();

  const [selected,        setSelected]      = useState<CollectionItem | null>(null);
  const [reportLoading,   setReportLoading] = useState(false);
  const [reportData,      setReportData]    = useState<MarketIntelligenceData | null>(null);

  /* BLOCK D — COLLECTION_OPEN once per mount. */
  const openLoggedRef = useRef(false);
  useEffect(() => {
    if (openLoggedRef.current) return;
    openLoggedRef.current = true;
    trackEvent("COLLECTION_OPEN", { source_type: "collection" });
  }, []);

  // Merge analysis items + MyActivity.saved by id. Analysis items win
  // when both sources describe the same artwork.
  const flatItems: FlatItem[] = (() => {
    const seen = new Set<string>();
    const out: FlatItem[] = [];
    for (const a of analysisItems) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push({
        id:       a.id,
        imageUrl: a.imagePreview ?? null,
        artist:   a.analysis.artist ?? "Unknown",
        title:    a.analysis.title  ?? "Untitled",
        analysis: a,
      });
    }
    for (const s of myState.saved) {
      if (seen.has(s.artwork_id)) continue;
      seen.add(s.artwork_id);
      out.push({
        id:       s.artwork_id,
        imageUrl: s.image_url,
        artist:   s.artist_name,
        title:    s.title,
      });
    }
    return out;
  })();

  const handleFullReport = async () => {
    if (!selected) return;
    setReportLoading(true);
    setReportData(null);
    try {
      const res  = await fetch("/api/market-intelligence", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ analysis: selected.analysis }),
      });
      const json = await res.json();
      if (json.success) setReportData(json.data as MarketIntelligenceData);
    } catch { /* silent */ }
    finally { setReportLoading(false); }
  };

  /* Tap → reopen QuickReport for the analysis-sourced item. */
  if (selected) {
    return (
      <QuickReport
        analysis={selected.analysis as QRAnalysis}
        imagePreview={selected.imagePreview ?? null}
        sourceType="text"
        onReset={() => {
          setSelected(null);
          setReportData(null);
          setReportLoading(false);
        }}
        onFullReport={handleFullReport}
        reportLoading={reportLoading}
        reportData={reportData}
      />
    );
  }

  return (
    <>
      <div style={{
        maxWidth:    640,
        margin:      "0 auto",
        background:  "#FFFFFF",
        minHeight: "calc(var(--vh, 1vh) * 100)",
        fontFamily:  FONT,
        paddingBottom: 110,
        boxSizing:   "border-box" as const,
        overflowX:   "hidden" as const,
      }}>
        {/* Header */}
        <div style={{ padding: "60px 22px 22px" }}>
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
            {t("nav.collection")}
          </h1>
          <p style={{ fontSize: 12, color: "#AAAAAA", margin: 0, letterSpacing: "0.01em" }}>
            {t("collection.subtitle")}
          </p>
        </div>

        {flatItems.length === 0 ? (
          <div style={{
            padding:   "100px 22px",
            textAlign: "center" as const,
          }}>
            <p style={{
              fontSize:   13,
              color:      "#BBBBBB",
              margin:     0,
              fontFamily: FONT,
            }}>
              {t("collection.empty")}
            </p>
          </div>
        ) : (
          <div style={{
            padding:             "8px 22px 0",
            display:             "grid",
            gridTemplateColumns: "1fr 1fr",
            gap:                 "20px 14px",
          }}>
            {flatItems.map(item => (
              <ArtworkTile
                key={item.id}
                item={item}
                onTap={() => {
                  /* BLOCK D — COLLECTION_ITEM_OPEN every tap. When
                     prior Ask history exists for this artwork, also
                     fire COLLECTION_REVISIT so analytics can split
                     impulse interest from intentional revisit. */
                  const aw = item.analysis;
                  const artworkId = aw
                    ? makeArtworkId({
                        title:  aw.analysis.title,
                        artist: aw.analysis.artist,
                        year:   aw.analysis.year,
                      })
                    : item.id;
                  trackEvent("COLLECTION_ITEM_OPEN", {
                    artwork_id:  artworkId,
                    source_type: "collection",
                  });
                  if (hasAskHistory(artworkId)) {
                    trackEvent("COLLECTION_REVISIT", {
                      artwork_id:  artworkId,
                      source_type: "collection",
                    });
                  }
                  if (aw) {
                    setSelected(aw);
                  } else {
                    // Gallery-only save — no analysis to reopen. Bounce to scan.
                    goTo("scan");
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav currentTab="collection" />
    </>
  );
}

function ArtworkTile({ item, onTap }: { item: FlatItem; onTap: () => void }) {
  const initials = item.artist
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onTap}
      style={{
        background: "none",
        border:     "none",
        cursor:     "pointer",
        padding:    0,
        textAlign:  "left" as const,
        fontFamily: FONT,
      }}
    >
      <div style={{
        width:        "100%",
        aspectRatio:  "1/1",
        background:   "#F4F4F2",
        borderRadius: 4,
        overflow:     "hidden",
      }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            style={{
              width:    "100%",
              height:   "100%",
              objectFit: "cover",
              display:  "block",
            }}
          />
        ) : (
          <div style={{
            width:          "100%",
            height:         "100%",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontSize:    22,
              color:       "rgba(0,0,0,0.18)",
              fontFamily:  FONT_HEAD,
              letterSpacing: "0.04em",
            }}>
              {initials}
            </span>
          </div>
        )}
      </div>
      <p style={{
        fontSize:      12,
        fontWeight:    600,
        color:         "#111",
        margin:        "9px 0 2px",
        fontFamily:    FONT_HEAD,
        overflow:      "hidden",
        textOverflow:  "ellipsis",
        whiteSpace:    "nowrap" as const,
        letterSpacing: "-0.005em",
      }}>
        {item.artist}
      </p>
      <p style={{
        fontSize:     11,
        color:        "#888",
        margin:       0,
        fontStyle:    "italic",
        overflow:     "hidden",
        textOverflow: "ellipsis",
        whiteSpace:   "nowrap" as const,
      }}>
        {item.title}
      </p>
    </button>
  );
}

/** Named export preserved — analyze AppShell composes this directly. */
export { CollectionPage as CollectionPageContent };

/** Default export wraps in Suspense so query params don't break SSR. */
export default function CollectionPageRoute() {
  return (
    <Suspense fallback={null}>
      <CollectionPage />
    </Suspense>
  );
}
