"use client";
import React, { useState, useMemo } from "react";
import { useCollection, CollectionItem, makeItemId } from "./hooks/useCollection";
import { QuickReport } from "../analyze/components/QuickReport";
import { MarketIntelligenceData } from "../analyze/components/MarketIntelligenceReport";

/* ── Mock demo items (shown when collection is empty) ────────── */

const DEMO_ITEMS: CollectionItem[] = [
  {
    id: makeItemId("Simon Fujiwara", "Who's Iconic?"),
    savedAt: "2025-04-18T09:20:00Z",
    liked: true, saved: true, collected: false,
    analysis: {
      title: "Who's Iconic? (Spanish Identity)",
      artist: "Simon Fujiwara",
      year: "2022",
      style: "Contemporary / Identity Politics",
      description: "아이코닉함의 의미를 비판적으로 해체하고 재구축하는 작업. 소비문화와 미디어 이미지의 문법을 차용해 정체성 정치학을 탐구한다.",
      emotions: { calm: 35, heavy: 75, warm: 45, inward: 80, movement: 25 },
      keywords: ["정체성", "아이코닉", "소비문화", "팝아트"],
      marketNote: "갤러리 및 기관 중심의 1차 시장이 강하게 형성된 작가입니다.",
      auctions: [
        { date: "2023-06", work: "Who the Bær", house: "Christie's", result: "$28,000", estimate: "$20K–$35K", note: "" },
        { date: "2022-11", work: "Untitled (Identity)", house: "Phillips", result: "$18,500", estimate: "$15K–$25K", note: "" },
      ],
      collections: [
        { inst: "Tate Modern", city: "London", period: "2019–현재", work: "Who the Bær" },
      ],
    },
    imagePreview: null,
  },
  {
    id: makeItemId("Yves Klein", "Blue Monochrome"),
    savedAt: "2025-04-15T14:30:00Z",
    liked: false, saved: true, collected: true,
    analysis: {
      title: "IKB 191",
      artist: "Yves Klein",
      year: "1962",
      style: "Abstract / Minimalism",
      description: "순수한 색으로서의 파랑 — 물질성을 초월한 절대적 공간의 표현. 클랭의 IKB(International Klein Blue)는 감각의 해방을 목표로 한다.",
      emotions: { calm: 88, heavy: 42, warm: 28, inward: 74, movement: 8 },
      keywords: ["미니멀", "색면", "순수성", "모노크롬"],
      marketNote: "블루칩 작가로 경매 시장에서 안정적인 수요를 보입니다.",
      auctions: [
        { date: "2022-05", work: "IKB Series", house: "Sotheby's", result: "$1,200,000", estimate: "$900K–$1.4M", note: "" },
        { date: "2020-11", work: "Monochrome Blue", house: "Christie's", result: "$980,000", estimate: "$800K–$1.2M", note: "" },
        { date: "2019-03", work: "IKB 82", house: "Phillips", result: "$750,000", estimate: "$600K–$900K", note: "" },
      ],
      collections: [
        { inst: "Centre Pompidou", city: "Paris", period: "영구 소장", work: "IKB 191" },
        { inst: "MoMA", city: "New York", period: "영구 소장", work: "Blue Monochrome" },
      ],
    },
    imagePreview: null,
  },
  {
    id: makeItemId("Agnes Martin", "Untitled 7"),
    savedAt: "2025-04-12T11:00:00Z",
    liked: true, saved: true, collected: false,
    analysis: {
      title: "Untitled #7",
      artist: "Agnes Martin",
      year: "1984",
      style: "Minimalism / Abstract",
      description: "극도로 미세한 선의 반복으로 구성된 고요한 화면. 마틴의 격자와 선은 명상적 공간을 만들며 감정을 초월한 고요함을 표현한다.",
      emotions: { calm: 95, heavy: 30, warm: 55, inward: 85, movement: 5 },
      keywords: ["미니멀", "명상", "고요", "선"],
      marketNote: "미국 미니멀리즘의 핵심 작가로 기관 소장 및 경매 모두 강한 수요.",
      auctions: [
        { date: "2023-11", work: "Untitled Series", house: "Sotheby's", result: "$4,800,000", estimate: "$4M–$6M", note: "" },
        { date: "2021-05", work: "Grey Stone", house: "Christie's", result: "$3,200,000", estimate: "$2.5M–$4M", note: "" },
      ],
      collections: [
        { inst: "Tate Modern", city: "London", period: "영구 소장", work: "Untitled" },
      ],
    },
    imagePreview: null,
  },
  {
    id: makeItemId("Lee Ufan", "Dialogue"),
    savedAt: "2025-04-08T16:45:00Z",
    liked: false, saved: true, collected: true,
    analysis: {
      title: "Dialogue",
      artist: "Lee Ufan",
      year: "2013",
      style: "Mono-ha / Contemporary",
      description: "여백과 붓질 사이의 대화. 이우환의 Dialogue 시리즈는 행위와 침묵, 존재와 부재의 관계를 캔버스 위에서 탐구한다.",
      emotions: { calm: 82, heavy: 55, warm: 40, inward: 90, movement: 18 },
      keywords: ["여백", "모노하", "대화", "침묵", "동양미학"],
      marketNote: "한국 작가 중 국제 경매 시장에서 가장 강한 수요를 가진 작가 중 하나입니다.",
      auctions: [
        { date: "2023-09", work: "Dialogue", house: "Sotheby's", result: "$680,000", estimate: "$500K–$800K", note: "" },
        { date: "2022-06", work: "From Point", house: "Christie's", result: "$520,000", estimate: "$400K–$700K", note: "" },
      ],
      collections: [
        { inst: "Guggenheim Bilbao", city: "Bilbao", period: "영구 소장", work: "Dialogue" },
      ],
    },
    imagePreview: null,
  },
];

/* ── Taste profile computation ───────────────────────────────── */

interface TasteProfile {
  topKeywords: Array<{ kw: string; count: number; strength: number }>;
  dominantEmotion: string;
  summary: string;
}

const EMOTION_DESC: Record<string, string> = {
  calm: "quiet and contemplative",
  heavy: "weighty and intense",
  warm: "emotionally warm",
  inward: "introspective and conceptual",
  movement: "dynamic and expressive",
};

function computeTaste(items: CollectionItem[]): TasteProfile | null {
  if (items.length === 0) return null;

  const kwCount: Record<string, number> = {};
  const emotionSum: Record<string, number> = {};

  items.forEach(item => {
    (item.analysis.keywords ?? []).forEach(kw => {
      kwCount[kw] = (kwCount[kw] ?? 0) + 1;
    });
    Object.entries(item.analysis.emotions ?? {}).forEach(([k, v]) => {
      emotionSum[k] = (emotionSum[k] ?? 0) + v;
    });
  });

  const sorted = Object.entries(kwCount).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] ?? 1;
  const topKeywords = sorted.slice(0, 5).map(([kw, count]) => ({
    kw, count, strength: count / maxCount,
  }));

  const dominantEmotion = Object.entries(emotionSum).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "calm";
  const topKws = topKeywords.slice(0, 3).map(t => t.kw).join(", ");
  const summary = `Your collection leans toward ${EMOTION_DESC[dominantEmotion] ?? "contemplative"} work — recurring themes of ${topKws || "varied subjects"}.`;

  return { topKeywords, dominantEmotion, summary };
}

/* ── Placeholder color from artist name ─────────────────────── */

const PLACEHOLDER_COLORS = ["#F3F0EC", "#EBF0F5", "#F0F3EB", "#F5EBF0", "#EBF5F5", "#F5F0F5"];
function placeholderBg(artist = ""): string {
  return PLACEHOLDER_COLORS[artist.charCodeAt(0) % PLACEHOLDER_COLORS.length];
}

/* ── Sub-components ──────────────────────────────────────────── */

function TasteProfileSection({ profile, itemCount }: { profile: TasteProfile; itemCount: number }) {
  return (
    <div style={{ padding: "24px 0 28px", borderBottom: "0.5px solid #F0F0F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <p style={{ fontSize: 9, color: "#AAA", letterSpacing: ".22em", textTransform: "uppercase" as const, margin: 0, fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
          TASTE PROFILE
        </p>
        <span style={{ fontSize: 10, color: "#CCC", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
          {itemCount} work{itemCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Keyword tags with weighted opacity */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 18 }}>
        {profile.topKeywords.map(({ kw, strength }, i) => (
          <span
            key={kw}
            style={{
              fontSize: i === 0 ? 13 : i < 2 ? 12 : 11,
              color: `rgba(0,0,0,${0.35 + strength * 0.55})`,
              letterSpacing: ".01em",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              fontWeight: i === 0 ? 500 : 400,
              padding: "5px 11px",
              background: `rgba(0,0,0,${0.03 + strength * 0.04})`,
            }}
          >
            {kw}
          </span>
        ))}
      </div>

      {/* Summary sentence */}
      <p style={{ fontSize: 12, color: "#888", lineHeight: 1.72, margin: 0, fontStyle: "italic", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
        {profile.summary}
      </p>
    </div>
  );
}

function ArtworkCard({ item, onClick }: { item: CollectionItem; onClick: () => void }) {
  const bg = placeholderBg(item.analysis.artist);

  return (
    <div
      onClick={onClick}
      style={{ cursor: "pointer", display: "flex", flexDirection: "column" as const }}
    >
      {/* Image */}
      <div style={{ width: "100%", aspectRatio: "1 / 1", background: bg, overflow: "hidden", position: "relative" as const }}>
        {item.imagePreview ? (
          <img
            src={item.imagePreview}
            alt={item.analysis.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 6 }}>
            <span style={{ fontSize: 22, color: "rgba(0,0,0,0.15)", fontFamily: "'KakaoBigSans', system-ui, sans-serif", fontWeight: 700, letterSpacing: "-0.03em" }}>
              {item.analysis.artist?.slice(0, 2) ?? "—"}
            </span>
          </div>
        )}
        {/* Status indicators */}
        <div style={{ position: "absolute" as const, top: 8, right: 8, display: "flex", gap: 4 }}>
          {item.liked && (
            <span style={{ fontSize: 11, color: "#E04848", lineHeight: 1 }}>♥</span>
          )}
          {item.collected && (
            <span style={{ fontSize: 10, color: "#3DAA78", lineHeight: 1 }}>▲</span>
          )}
        </div>
      </div>

      {/* Text */}
      <div style={{ paddingTop: 10, paddingBottom: 18 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: "#111", margin: "0 0 2px", lineHeight: 1.3, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
          {item.analysis.artist ?? "Unknown"}
        </p>
        <p style={{ fontSize: 11, color: "#888", margin: "0 0 1px", fontStyle: "italic", lineHeight: 1.4 }}>
          {item.analysis.title ?? "Untitled"}
        </p>
        <p style={{ fontSize: 10, color: "#C0C0C0", margin: 0 }}>
          {item.analysis.year}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", minHeight: 360, padding: "0 32px", textAlign: "center" as const }}>
      <div style={{ width: 56, height: 56, border: "1px solid #E8E8E8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 22, color: "#DDD" }}>◇</span>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111", margin: "0 0 10px", fontFamily: "'KakaoBigSans', system-ui, sans-serif", letterSpacing: "-.01em" }}>
        Start building your collection
      </h2>
      <p style={{ fontSize: 13, color: "#AAA", lineHeight: 1.7, margin: "0 0 32px", maxWidth: 260 }}>
        Scan artworks and save what resonates with you.
      </p>
      <a
        href="/analyze"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#0F0F0F", color: "#FFF", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 12, letterSpacing: ".06em", textDecoration: "none" }}
      >
        <span style={{ fontSize: 10, color: "#7C6FF7" }}>◆</span>
        Scan Artwork
      </a>
    </div>
  );
}

/* ── Sort types ──────────────────────────────────────────────── */

type SortKey = "recent" | "liked" | "artist" | "style";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently saved" },
  { key: "liked",  label: "Most liked"     },
  { key: "artist", label: "By artist"      },
  { key: "style",  label: "By style"       },
];

function sortItems(items: CollectionItem[], by: SortKey): CollectionItem[] {
  switch (by) {
    case "liked":  return [...items].sort((a, b) => (b.liked ? 1 : 0) - (a.liked ? 1 : 0));
    case "artist": return [...items].sort((a, b) => (a.analysis.artist ?? "").localeCompare(b.analysis.artist ?? ""));
    case "style":  return [...items].sort((a, b) => (a.analysis.style ?? "").localeCompare(b.analysis.style ?? ""));
    default:       return [...items].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }
}

/* ── Page styles ─────────────────────────────────────────────── */

const COL_STYLES = `
  @keyframes col-spin { to { transform: rotate(360deg); } }
  .col-filter-btn { transition: all .15s; }
  .col-filter-btn:hover { background: #F5F5F5 !important; }
  .col-card { transition: opacity .15s; }
  .col-card:hover { opacity: .85; }
`;

/* ── Main page ───────────────────────────────────────────────── */

export default function CollectionPage() {
  const { items, hydrated, patch } = useCollection();
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  // Full report state (for when QuickReport triggers intelligence report)
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<MarketIntelligenceData | null>(null);

  // Use real items if available, otherwise show demo
  const displayItems = useMemo(() => {
    const base = items.length > 0 ? items : DEMO_ITEMS;
    return sortItems(base, sortBy);
  }, [items, sortBy]);

  const isDemoMode = items.length === 0;
  const taste = useMemo(() => computeTaste(displayItems), [displayItems]);

  const handleFullReport = async () => {
    if (!selectedItem) return;
    setReportLoading(true);
    setReportData(null);
    try {
      const res = await fetch("/api/market-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: selectedItem.analysis }),
      });
      const json = await res.json();
      if (json.success) setReportData(json.data as MarketIntelligenceData);
    } catch { /* silent */ }
    finally { setReportLoading(false); }
  };

  // Show QuickReport for selected artwork
  if (selectedItem) {
    return (
      <QuickReport
        analysis={selectedItem.analysis}
        imagePreview={selectedItem.imagePreview ?? null}
        sourceType="text"
        onReset={() => {
          setSelectedItem(null);
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
      <style dangerouslySetInnerHTML={{ __html: COL_STYLES }} />
      <div style={{
        maxWidth: 640, margin: "0 auto", background: "#FFF",
        minHeight: "100vh", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        boxSizing: "border-box" as const, overflowX: "hidden",
        paddingBottom: 80,
      }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div style={{ padding: "60px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <h1 style={{
              fontSize: 32, fontWeight: 700, color: "#0A0A0A", margin: 0,
              fontFamily: "'KakaoBigSans', system-ui, sans-serif", letterSpacing: "-.025em", lineHeight: 1,
            }}>
              Collection
            </h1>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginTop: 4 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="5" r="1.2" fill="#AAA" />
                <circle cx="9" cy="9" r="1.2" fill="#AAA" />
                <circle cx="9" cy="13" r="1.2" fill="#AAA" />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: 13, color: "#AAA", margin: 0, letterSpacing: ".01em" }}>
            Your saved artworks and taste profile
          </p>
          {isDemoMode && (
            <p style={{ fontSize: 10, color: "#C8B87C", margin: "10px 0 0", letterSpacing: ".04em" }}>
              DEMO — save artworks from /analyze to build your real collection
            </p>
          )}
        </div>

        <div style={{ padding: "0 24px" }}>

          {/* ── Taste Profile ───────────────────────────────────── */}
          {taste && !hydrated ? null : taste ? (
            <TasteProfileSection profile={taste} itemCount={displayItems.length} />
          ) : null}

          {/* ── Filter row ──────────────────────────────────────── */}
          {displayItems.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto" as const, padding: "20px 0", scrollbarWidth: "none" as const }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className="col-filter-btn"
                  style={{
                    flexShrink: 0, padding: "7px 14px", border: "none", cursor: "pointer",
                    fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 11,
                    letterSpacing: ".03em", whiteSpace: "nowrap" as const,
                    background: sortBy === opt.key ? "#0F0F0F" : "#F6F6F6",
                    color: sortBy === opt.key ? "#FFF" : "#777",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Grid or Empty state ─────────────────────────────── */}
          {!hydrated ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
              <div style={{ width: 20, height: 20, border: "1.5px solid #EEE", borderTop: "1.5px solid #888", borderRadius: "50%", animation: "col-spin 0.8s linear infinite" }} />
            </div>
          ) : displayItems.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {displayItems.map(item => (
                <div key={item.id} className="col-card">
                  <ArtworkCard
                    item={item}
                    onClick={() => {
                      setReportData(null);
                      setReportLoading(false);
                      setSelectedItem(item);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom: Scan Artwork CTA ─────────────────────────── */}
        {displayItems.length > 0 && (
          <div style={{ position: "fixed" as const, bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 640, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "0.5px solid #EBEBEB", padding: "12px 24px 20px", display: "flex", gap: 10, alignItems: "center", boxSizing: "border-box" as const }}>
            {/* Collection nav indicator */}
            <div style={{ flex: 1, display: "flex", gap: 16, alignItems: "center" }}>
              <a href="/analyze" style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3, textDecoration: "none", color: "#C0C0C0" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 9, letterSpacing: ".04em", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>Scan</span>
              </a>
              <a href="/collection" style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3, textDecoration: "none", color: "#0F0F0F" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" />
                  <rect x="11" y="2" width="7" height="7" rx="1" fill="currentColor" />
                  <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" />
                  <rect x="11" y="11" width="7" height="7" rx="1" fill="currentColor" />
                </svg>
                <span style={{ fontSize: 9, letterSpacing: ".04em", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontWeight: 600 }}>Collection</span>
              </a>
            </div>
            <a
              href="/analyze"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", background: "#0F0F0F", color: "#FFF", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 11, letterSpacing: ".06em", textDecoration: "none", flexShrink: 0 }}
            >
              <span style={{ fontSize: 9, color: "#7C6FF7" }}>◆</span>
              Scan Artwork
            </a>
          </div>
        )}
      </div>
    </>
  );
}
