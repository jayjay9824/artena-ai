"use client";
import React, { useState } from "react";
import { useRecommendations } from "./hooks/useRecommendations";
import { FeaturedCard } from "./components/FeaturedCard";
import { FeedItem } from "./components/FeedItem";
import { CuratorMessage } from "./components/CuratorMessage";
import { FilterBar } from "./components/FilterBar";
import { QuickReport } from "../analyze/components/QuickReport";
import { MarketIntelligenceData } from "../analyze/components/MarketIntelligenceReport";
import { Recommendation } from "./types/recommendation";
import { useCollection } from "../collection/hooks/useCollection";
import { BottomNav } from "../components/BottomNav";

const PAGE_STYLES = `
  .rec-back-btn:hover { opacity: 0.85; }
`;

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rec-back-btn"
      style={{
        position: "fixed", top: 50, left: 18,
        display: "flex", alignItems: "center", gap: 6,
        padding: "9px 16px 9px 11px",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        border: "none", borderRadius: 24, cursor: "pointer",
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        zIndex: 200, transition: "opacity .15s",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7L9 12" stroke="#111" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", letterSpacing: "-.01em" }}>
        뒤로
      </span>
    </button>
  );
}

function RecommendationsPage() {
  const { recs, images, activeFilter, setFilter, toggleAction } = useRecommendations();
  const { items } = useCollection();
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<MarketIntelligenceData | null>(null);

  // Derive taste keywords from saved collection items
  const tasteKeywords = (() => {
    const freq: Record<string, number> = {};
    items.forEach(item => {
      (item.analysis.keywords ?? []).forEach(k => { freq[k] = (freq[k] ?? 0) + 1; });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 5);
  })();

  const handleFullReport = async () => {
    if (!selectedRec) return;
    setReportLoading(true);
    setReportData(null);
    try {
      const res = await fetch("/api/market-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: selectedRec.analysis }),
      });
      const json = await res.json();
      if (json.success) setReportData(json.data as MarketIntelligenceData);
    } catch { /* ignore */ }
    finally { setReportLoading(false); }
  };

  // Show QuickReport when artwork selected
  if (selectedRec) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />
        <BackBtn onClick={() => { setSelectedRec(null); setReportData(null); setReportLoading(false); }} />
        <QuickReport
          analysis={selectedRec.analysis}
          imagePreview={images[selectedRec.id] ?? null}
          sourceType="text"
          onReset={() => { setSelectedRec(null); setReportData(null); setReportLoading(false); }}
          onFullReport={handleFullReport}
          reportLoading={reportLoading}
          reportData={reportData}
        />
      </>
    );
  }

  const featured = recs[0] ?? null;
  const feed = recs.slice(1);

  // Build editorial feed sections: [pair], [large], [pair], [large], ...
  const feedNodes: React.ReactNode[] = [];
  let i = 0;
  let flipLarge = false;

  while (i < feed.length) {
    // Pair of small cards
    const a = feed[i];
    const b = feed[i + 1];
    i += b ? 2 : 1;

    feedNodes.push(
      <div key={`pair-${i}`} style={{
        display: "grid", gridTemplateColumns: b ? "1fr 1fr" : "1fr",
        gap: 18, padding: "26px 22px 26px", borderBottom: "0.5px solid #F2F2F2",
      }}>
        <FeedItem
          rec={a} imageUrl={images[a.id] ?? null} variant="small"
          onTap={() => setSelectedRec(a)}
          onLike={() => toggleAction(a.id, "liked")}
          onSave={() => toggleAction(a.id, "saved")}
        />
        {b && (
          <FeedItem
            rec={b} imageUrl={images[b.id] ?? null} variant="small"
            onTap={() => setSelectedRec(b)}
            onLike={() => toggleAction(b.id, "liked")}
            onSave={() => toggleAction(b.id, "saved")}
          />
        )}
      </div>
    );

    // Large card after each pair
    if (i < feed.length) {
      const item = feed[i++];
      feedNodes.push(
        <FeedItem
          key={`large-${i}`}
          rec={item} imageUrl={images[item.id] ?? null} variant="large" flip={flipLarge}
          onTap={() => setSelectedRec(item)}
          onLike={() => toggleAction(item.id, "liked")}
          onSave={() => toggleAction(item.id, "saved")}
        />
      );
      flipLarge = !flipLarge;
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />
      <div style={{
        maxWidth: 640, margin: "0 auto", background: "#FFFFFF",
        minHeight: "100vh", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        boxSizing: "border-box" as const, overflowX: "hidden", paddingBottom: 80,
      }}>

        {/* ── Header ────────────────────────────────────────────── */}
        <div style={{ padding: "58px 22px 18px", borderBottom: "0.5px solid #F2F2F2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 8, color: "#D0D0D0", letterSpacing: ".18em", textTransform: "uppercase", margin: "0 0 7px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
                Powered by ARTENA AI
              </p>
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: "#0D0D0D", margin: "0 0 4px",
                fontFamily: "'KakaoBigSans', system-ui, sans-serif", letterSpacing: "-.025em",
              }}>
                Recommended
              </h1>
              <p style={{ fontSize: 12, color: "#B0B0B0", margin: 0, letterSpacing: ".01em" }}>
                Based on your taste profile
              </p>
            </div>

            {/* Filter icon */}
            <button
              onClick={() => document.getElementById("rec-filter-bar")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              style={{ background: "none", border: "0.5px solid #E8E8E8", cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4, flexShrink: 0 }}
            >
              <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
                <path d="M1 1.5h13M3.5 6h8M6 10.5h3" stroke="#888" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Featured Card ──────────────────────────────────────── */}
        {featured ? (
          <FeaturedCard
            rec={featured}
            imageUrl={images[featured.id] ?? null}
            onTap={() => setSelectedRec(featured)}
          />
        ) : (
          <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 13, color: "#CCC" }}>No recommendations match this filter.</p>
          </div>
        )}

        {/* ── Curator Message ────────────────────────────────────── */}
        <CuratorMessage tasteKeywords={tasteKeywords} />

        {/* ── Filter Bar ─────────────────────────────────────────── */}
        <div id="rec-filter-bar">
          <FilterBar activeFilter={activeFilter} onFilter={setFilter} />
        </div>

        {/* ── Editorial Feed ─────────────────────────────────────── */}
        {feed.length === 0 && featured && (
          <div style={{ padding: "48px 22px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#C0C0C0", letterSpacing: ".04em" }}>No additional results for this filter.</p>
          </div>
        )}
        {feedNodes}

        {/* ── Spacer so last card isn't behind nav ───────────────── */}
        <div style={{ height: 24 }} />

        <BottomNav currentTab="recommendations" />

      </div>
    </>
  );
}

export { RecommendationsPage as RecommendationsPageContent };
export default RecommendationsPage;
