"use client";
import React, { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCollection, CollectionItem, makeItemId } from "./hooks/useCollection";
import { useMyActivity, SavedArtwork, Collection as ColGroup } from "../context/MyActivityContext";
import { useTabNav } from "../context/TabContext";
import { QuickReport } from "../analyze/components/QuickReport";
import { MarketIntelligenceData } from "../analyze/components/MarketIntelligenceReport";
import { BottomNav } from "../components/BottomNav";

/* ─────────────────────────────────────────────────────────────────
   FONTS & CONSTANTS
───────────────────────────────────────────────────────────────── */
const F  = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const FH = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

/* ─────────────────────────────────────────────────────────────────
   UNIFIED DISPLAY TYPE
───────────────────────────────────────────────────────────────── */
interface DisplayArtwork {
  id: string;
  imageUrl: string | null;
  artistName: string;
  title: string;
  year: string;
  style?: string;
  keywords?: string[];
  emotions?: Record<string, number>;
  liked: boolean;
  saved: boolean;
  inCollection: boolean;
  source: "analysis" | "gallery";
  analysisItem?: CollectionItem;
  activityAt: string;
}

/* ─────────────────────────────────────────────────────────────────
   DATA MERGE
───────────────────────────────────────────────────────────────── */
function fromAnalysis(item: CollectionItem): DisplayArtwork {
  return {
    id: item.id,
    imageUrl: item.imagePreview ?? null,
    artistName: item.analysis.artist ?? "Unknown",
    title: item.analysis.title ?? "Untitled",
    year: item.analysis.year ?? "",
    style: item.analysis.style,
    keywords: item.analysis.keywords,
    emotions: item.analysis.emotions,
    liked: item.liked,
    saved: item.saved,
    inCollection: item.collected,
    source: "analysis",
    analysisItem: item,
    activityAt: item.savedAt,
  };
}

function fromSavedArtwork(a: SavedArtwork, liked: boolean, saved: boolean, inCol: boolean): DisplayArtwork {
  return {
    id: a.artwork_id,
    imageUrl: a.image_url,
    artistName: a.artist_name,
    title: a.title,
    year: String(a.year ?? ""),
    liked, saved, inCollection: inCol,
    source: "gallery",
    activityAt: new Date().toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────────────
   TASTE SIGNAL COMPUTATION
───────────────────────────────────────────────────────────────── */
interface TasteSignal {
  topKeywords: Array<{ kw: string; count: number; strength: number }>;
  topArtists: string[];
  dominantEmotion: string;
  summary: string;
}

const EMOTION_LABEL: Record<string, string> = {
  calm: "고요하고 사색적인", heavy: "묵직하고 강렬한",
  warm: "감성적으로 따뜻한", inward: "내면적이고 개념적인", movement: "역동적이고 표현적인",
};

function computeTasteSignal(items: DisplayArtwork[]): TasteSignal | null {
  const src = items.filter(i => i.source === "analysis");
  if (src.length === 0) return null;

  const kwCount: Record<string, number> = {};
  const emotionSum: Record<string, number> = {};
  const artistCount: Record<string, number> = {};

  src.forEach(i => {
    (i.keywords ?? []).forEach(k => { kwCount[k] = (kwCount[k] ?? 0) + 1; });
    Object.entries(i.emotions ?? {}).forEach(([k, v]) => { emotionSum[k] = (emotionSum[k] ?? 0) + v; });
    artistCount[i.artistName] = (artistCount[i.artistName] ?? 0) + 1;
  });

  const sorted = Object.entries(kwCount).sort((a, b) => b[1] - a[1]);
  const maxC = sorted[0]?.[1] ?? 1;
  const topKeywords = sorted.slice(0, 6).map(([kw, count]) => ({ kw, count, strength: count / maxC }));
  const dominantEmotion = Object.entries(emotionSum).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "calm";
  const topArtists = Object.entries(artistCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([a]) => a);
  const topKws = topKeywords.slice(0, 3).map(t => t.kw).join(" · ");
  const summary = `${EMOTION_LABEL[dominantEmotion] ?? "개성 있는"} 작품을 선호합니다 — ${topKws || "다양한 주제"}에 반복적으로 끌리는 취향입니다.`;

  return { topKeywords, topArtists, dominantEmotion, summary };
}

/* ─────────────────────────────────────────────────────────────────
   SORT
───────────────────────────────────────────────────────────────── */
type SortKey = "recent" | "artist" | "style" | "year";
const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "최근 순" },
  { key: "artist", label: "작가별" },
  { key: "style",  label: "스타일별" },
  { key: "year",   label: "연도별" },
];
function sortArtworks(items: DisplayArtwork[], by: SortKey): DisplayArtwork[] {
  switch (by) {
    case "artist": return [...items].sort((a, b) => a.artistName.localeCompare(b.artistName));
    case "style":  return [...items].sort((a, b) => (a.style ?? "").localeCompare(b.style ?? ""));
    case "year":   return [...items].sort((a, b) => b.year.localeCompare(a.year));
    default:       return [...items].sort((a, b) => b.activityAt.localeCompare(a.activityAt));
  }
}

/* ─────────────────────────────────────────────────────────────────
   PLACEHOLDER
───────────────────────────────────────────────────────────────── */
const PALETTES = ["#F3F0EC", "#EBF0F5", "#F0F3EB", "#F5EBF0", "#EBF5F5", "#F5F3F0"];
const placeholderBg = (name = "") => PALETTES[name.charCodeAt(0) % PALETTES.length];

/* ─────────────────────────────────────────────────────────────────
   SVG ICONS
───────────────────────────────────────────────────────────────── */
const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M8 13.5C8 13.5 2 9.5 2 5.5a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 8-6 8Z"
      fill={filled ? "#E04040" : "none"} stroke={filled ? "#E04040" : "rgba(255,255,255,0.7)"} strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="10" height="12" viewBox="0 0 12 16" fill="none">
    <path d="M2 2h8a1 1 0 0 1 1 1v11l-5-3.2L1 14V3a1 1 0 0 1 1-1Z"
      fill={filled ? "#5A5AF0" : "none"} stroke={filled ? "#5A5AF0" : "rgba(255,255,255,0.7)"} strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
const FolderIcon = ({ active }: { active?: boolean }) => (
  <svg width="12" height="11" viewBox="0 0 14 12" fill="none">
    <path d="M1 3a1 1 0 0 1 1-1h3.5l1.5 1.5H12a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3Z"
      fill={active ? "#3DAA78" : "none"} stroke={active ? "#3DAA78" : "rgba(255,255,255,0.7)"} strokeWidth="1.3" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────
   TASTE SIGNAL SUMMARY
───────────────────────────────────────────────────────────────── */
function TasteSignalSummary({ signal, likedCount, savedCount, colCount }: {
  signal: TasteSignal | null; likedCount: number; savedCount: number; colCount: number;
}) {
  const hasAny = likedCount + savedCount + colCount > 0;
  return (
    <div style={{ padding: "24px 0 28px", borderBottom: "0.5px solid #F0F0F0" }}>
      {/* Counts row */}
      <div style={{ display: "flex", gap: 0, marginBottom: signal ? 20 : 0 }}>
        {[
          { icon: <HeartIcon filled />, value: likedCount, label: "좋아요" },
          { icon: <BookmarkIcon filled />, value: savedCount, label: "저장" },
          { icon: <FolderIcon active />, value: colCount, label: "컬렉션" },
        ].map(({ icon, value, label }, i) => (
          <div key={label} style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRight: i < 2 ? "0.5px solid #F0F0F0" : "none" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{icon}</div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#0D0D0D", margin: "0 0 3px", fontFamily: FH }}>{value}</p>
            <p style={{ fontSize: 9, color: "#AAAAAA", margin: 0, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: F }}>{label}</p>
          </div>
        ))}
      </div>

      {signal && hasAny && (
        <>
          {/* Source context */}
          <p style={{ fontSize: 9, color: "#BBBBBB", letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: F }}>취향 분석 기준</p>

          {/* Keyword cloud */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {signal.topKeywords.map(({ kw, strength }, i) => (
              <span key={kw} style={{
                fontSize: i === 0 ? 13 : i < 3 ? 12 : 11,
                color: `rgba(0,0,0,${0.32 + strength * 0.58})`,
                fontFamily: F, fontWeight: i < 2 ? 500 : 400,
                padding: "4px 10px", background: `rgba(0,0,0,${0.03 + strength * 0.04})`,
                letterSpacing: ".01em",
              }}>{kw}</span>
            ))}
          </div>

          {/* Top artists */}
          {signal.topArtists.length > 0 && (
            <p style={{ fontSize: 11, color: "#AAAAAA", margin: "0 0 12px", fontFamily: F }}>
              {signal.topArtists.join(" · ")}
            </p>
          )}

          {/* Summary */}
          <p style={{ fontSize: 12, color: "#888", lineHeight: 1.72, margin: 0, fontStyle: "italic", fontFamily: F }}>
            {signal.summary}
          </p>
        </>
      )}

      {!hasAny && (
        <p style={{ fontSize: 12, color: "#C8C8C8", margin: 0, fontFamily: F, textAlign: "center", paddingTop: 4 }}>
          좋아요, 저장, 컬렉션을 바탕으로 당신의 취향을 분석합니다.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ARTWORK CARD
───────────────────────────────────────────────────────────────── */
function ArtworkCard({ artwork, onClick }: { artwork: DisplayArtwork; onClick: () => void }) {
  const bg = placeholderBg(artwork.artistName);
  const initials = artwork.artistName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hasStatus = artwork.liked || artwork.saved || artwork.inCollection;

  return (
    <div onClick={onClick} className="col-card" style={{ cursor: "pointer" }}>
      {/* Image */}
      <div style={{ width: "100%", aspectRatio: "1/1", background: bg, overflow: "hidden", position: "relative", borderRadius: 2 }}>
        {artwork.imageUrl
          ? <img src={artwork.imageUrl} alt={artwork.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 20, fontWeight: 300, color: "rgba(0,0,0,0.18)", fontFamily: FH, letterSpacing: ".04em" }}>{initials}</span>
            </div>
        }
        {/* Status badges */}
        {hasStatus && (
          <div style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 4, alignItems: "center" }}>
            {artwork.liked && (
              <span style={{ background: "rgba(0,0,0,0.38)", borderRadius: 20, padding: "3px 5px", display: "flex", alignItems: "center" }}>
                <HeartIcon filled />
              </span>
            )}
            {artwork.saved && (
              <span style={{ background: "rgba(0,0,0,0.38)", borderRadius: 20, padding: "3px 5px", display: "flex", alignItems: "center" }}>
                <BookmarkIcon filled />
              </span>
            )}
            {artwork.inCollection && (
              <span style={{ background: "rgba(0,0,0,0.38)", borderRadius: 20, padding: "3px 5px", display: "flex", alignItems: "center" }}>
                <FolderIcon active />
              </span>
            )}
          </div>
        )}
        {/* Source label for gallery artworks */}
        {artwork.source === "gallery" && (
          <div style={{ position: "absolute", bottom: 6, left: 7 }}>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.72)", background: "rgba(0,0,0,0.35)", borderRadius: 10, padding: "2px 6px", fontFamily: F, letterSpacing: ".08em" }}>
              GALLERY
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ paddingTop: 9, paddingBottom: 18 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#111", margin: "0 0 2px", fontFamily: FH, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {artwork.artistName}
        </p>
        <p style={{ fontSize: 11, color: "#888", margin: "0 0 1px", fontStyle: "italic", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {artwork.title}
        </p>
        {artwork.year && (
          <p style={{ fontSize: 10, color: "#C0C0C0", margin: 0, fontFamily: F }}>{artwork.year}</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COLLECTION GROUP CARD
───────────────────────────────────────────────────────────────── */
function CollectionGroupCard({ col, onClick }: { col: ColGroup; onClick: () => void }) {
  const previews = col.items.slice(0, 4);
  const hasImages = previews.some(i => i.artwork.image_url);

  return (
    <div onClick={onClick} className="col-card" style={{ cursor: "pointer", marginBottom: 2 }}>
      {/* Mosaic preview */}
      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 2, overflow: "hidden", background: "#F4F4F2", display: "grid", gridTemplateColumns: previews.length >= 2 ? "1fr 1fr" : "1fr", gap: "1px" }}>
        {previews.length === 0
          ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: "#C8C8C4", letterSpacing: ".1em", fontFamily: F }}>EMPTY</span>
            </div>
          : previews.map((item, i) => {
            const bg2 = placeholderBg(item.artwork.artist_name);
            return (
              <div key={i} style={{ background: bg2, overflow: "hidden", position: "relative" }}>
                {item.artwork.image_url
                  ? <img src={item.artwork.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 10, color: "rgba(0,0,0,0.18)", fontFamily: FH }}>
                        {item.artwork.artist_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                }
              </div>
            );
          })
        }
      </div>
      <div style={{ paddingTop: 9, paddingBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0D0D0D", margin: "0 0 3px", fontFamily: FH }}>{col.name}</p>
        <p style={{ fontSize: 11, color: "#AAAAAA", margin: 0, fontFamily: F }}>{col.items.length} works</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COLLECTION GROUP DETAIL
───────────────────────────────────────────────────────────────── */
function CollectionGroupDetail({ col, analysisItems, onBack, onSelectArtwork }: {
  col: ColGroup;
  analysisItems: CollectionItem[];
  onBack: () => void;
  onSelectArtwork: (item: CollectionItem) => void;
}) {
  const { goTo } = useTabNav();

  const handleClick = (artwork: SavedArtwork) => {
    if (artwork.source === "analysis") {
      const match = analysisItems.find(i => i.id === artwork.artwork_id);
      if (match) { onSelectArtwork(match); return; }
    }
    goTo("gallery");
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: "60px 24px 0" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888", fontFamily: F, padding: "0 0 20px 0" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Collection
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0D0D0D", margin: "0 0 4px", fontFamily: FH }}>{col.name}</h1>
        <p style={{ fontSize: 12, color: "#AAAAAA", margin: "0 0 28px", fontFamily: F }}>{col.items.length} works</p>
      </div>
      <div style={{ padding: "0 24px" }}>
        {col.items.length === 0
          ? <EmptyTabState text="이 컬렉션에 아직 작품이 없습니다." sub="" />
          : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {col.items.map(item => {
                const a = item.artwork;
                const bg = placeholderBg(a.artist_name);
                const initials = a.artist_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={a.artwork_id} className="col-card" style={{ cursor: "pointer" }} onClick={() => handleClick(a)}>
                    <div style={{ width: "100%", aspectRatio: "1/1", background: bg, overflow: "hidden", borderRadius: 2 }}>
                      {a.image_url
                        ? <img src={a.image_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 20, fontWeight: 300, color: "rgba(0,0,0,0.18)", fontFamily: FH }}>{initials}</span>
                          </div>
                      }
                    </div>
                    <div style={{ paddingTop: 9, paddingBottom: 18 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#111", margin: "0 0 2px", fontFamily: FH, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.artist_name}</p>
                      <p style={{ fontSize: 11, color: "#888", margin: 0, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────────── */
function EmptyTabState({ text, sub }: { text: string; sub: string }) {
  return (
    <div style={{ padding: "60px 0", textAlign: "center" }}>
      <div style={{ width: 44, height: 44, border: "0.5px solid #E8E8E8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", borderRadius: 10 }}>
        <span style={{ fontSize: 18, color: "#DDD" }}>◇</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#888", margin: "0 0 8px", fontFamily: FH }}>{text}</p>
      {sub && <p style={{ fontSize: 12, color: "#C8C8C8", margin: 0, lineHeight: 1.6, fontFamily: F, maxWidth: 240, marginLeft: "auto", marginRight: "auto" }}>{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SORT BAR
───────────────────────────────────────────────────────────────── */
function SortBar({ active, onChange }: { active: SortKey; onChange: (k: SortKey) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "14px 0 0", scrollbarWidth: "none" }}>
      {SORT_OPTS.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          flexShrink: 0, padding: "6px 14px", border: "none", cursor: "pointer",
          fontFamily: F, fontSize: 11, letterSpacing: ".03em", borderRadius: 20,
          background: active === o.key ? "#0D0D0D" : "#F4F4F2",
          color: active === o.key ? "#FFF" : "#888",
          transition: "all .15s",
        }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TAB BAR
───────────────────────────────────────────────────────────────── */
type MainTab = "saved" | "liked" | "collections";

function MainTabBar({ active, onSelect, counts }: {
  active: MainTab;
  onSelect: (t: MainTab) => void;
  counts: Record<MainTab, number>;
}) {
  const tabs: { id: MainTab; label: string }[] = [
    { id: "saved",       label: "저장" },
    { id: "liked",       label: "좋아요" },
    { id: "collections", label: "컬렉션" },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "0.5px solid #EBEBEB", marginBottom: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          flex: 1, padding: "13px 4px 12px", background: "none", border: "none", cursor: "pointer",
          borderBottom: `2px solid ${active === t.id ? "#0D0D0D" : "transparent"}`,
          fontFamily: F, fontSize: 13, fontWeight: active === t.id ? 700 : 400,
          color: active === t.id ? "#0D0D0D" : "#AAAAAA", letterSpacing: ".02em",
          transition: "all .15s",
        }}>
          {t.label}
          {counts[t.id] > 0 && (
            <span style={{ marginLeft: 5, fontSize: 10, color: active === t.id ? "#0D0D0D" : "#C8C8C8", fontFamily: F }}>
              {counts[t.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DEMO ITEMS
───────────────────────────────────────────────────────────────── */
const DEMO_ITEMS: CollectionItem[] = [
  {
    id: makeItemId("Agnes Martin", "Untitled 7"),
    savedAt: "2025-04-12T11:00:00Z",
    liked: true, saved: true, collected: false,
    analysis: {
      title: "Untitled #7", artist: "Agnes Martin", year: "1984",
      style: "Minimalism / Abstract",
      description: "극도로 미세한 선의 반복으로 구성된 고요한 화면.",
      emotions: { calm: 95, heavy: 30, warm: 55, inward: 85, movement: 5 },
      keywords: ["미니멀", "명상", "고요", "선"],
      marketNote: "미국 미니멀리즘의 핵심 작가.",
      auctions: [{ date: "2023-11", work: "Untitled Series", house: "Sotheby's", result: "$4,800,000", estimate: "$4M–$6M", note: "" }],
      collections: [{ inst: "Tate Modern", city: "London", period: "영구 소장", work: "Untitled" }],
    },
    imagePreview: null,
  },
  {
    id: makeItemId("Yves Klein", "IKB 191"),
    savedAt: "2025-04-15T14:30:00Z",
    liked: false, saved: true, collected: true,
    analysis: {
      title: "IKB 191", artist: "Yves Klein", year: "1962",
      style: "Abstract / Minimalism",
      description: "순수한 색으로서의 파랑.",
      emotions: { calm: 88, heavy: 42, warm: 28, inward: 74, movement: 8 },
      keywords: ["미니멀", "색면", "순수성", "모노크롬"],
      marketNote: "블루칩 작가.",
      auctions: [{ date: "2022-05", work: "IKB Series", house: "Sotheby's", result: "$1,200,000", estimate: "$900K–$1.4M", note: "" }],
      collections: [{ inst: "Centre Pompidou", city: "Paris", period: "영구 소장", work: "IKB 191" }],
    },
    imagePreview: null,
  },
  {
    id: makeItemId("Lee Ufan", "Dialogue"),
    savedAt: "2025-04-08T16:45:00Z",
    liked: true, saved: true, collected: true,
    analysis: {
      title: "Dialogue", artist: "Lee Ufan", year: "2013",
      style: "Mono-ha / Contemporary",
      description: "여백과 붓질 사이의 대화.",
      emotions: { calm: 82, heavy: 55, warm: 40, inward: 90, movement: 18 },
      keywords: ["여백", "모노하", "대화", "침묵", "동양미학"],
      marketNote: "국제 경매 시장에서 강한 수요.",
      auctions: [{ date: "2023-09", work: "Dialogue", house: "Sotheby's", result: "$680,000", estimate: "$500K–$800K", note: "" }],
      collections: [{ inst: "Guggenheim Bilbao", city: "Bilbao", period: "영구 소장", work: "Dialogue" }],
    },
    imagePreview: null,
  },
  {
    id: makeItemId("Simon Fujiwara", "Who's Iconic?"),
    savedAt: "2025-04-18T09:20:00Z",
    liked: true, saved: false, collected: false,
    analysis: {
      title: "Who's Iconic?", artist: "Simon Fujiwara", year: "2022",
      style: "Contemporary / Identity Politics",
      description: "아이코닉함의 의미를 비판적으로 해체하고 재구축하는 작업.",
      emotions: { calm: 35, heavy: 75, warm: 45, inward: 80, movement: 25 },
      keywords: ["정체성", "아이코닉", "소비문화", "팝아트"],
      marketNote: "갤러리 및 기관 중심의 1차 시장이 강합니다.",
      auctions: [{ date: "2023-06", work: "Who the Bær", house: "Christie's", result: "$28,000", estimate: "$20K–$35K", note: "" }],
      collections: [{ inst: "Tate Modern", city: "London", period: "2019–현재", work: "Who the Bær" }],
    },
    imagePreview: null,
  },
];

/* ─────────────────────────────────────────────────────────────────
   PAGE STYLES
───────────────────────────────────────────────────────────────── */
const PAGE_STYLES = `
  .col-card { transition: opacity .15s; }
  .col-card:hover { opacity: .82; }
`;

/* ─────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────── */
/** Map the spec's ?tab values onto the internal tab keys. */
function readTabParam(raw: string | null): MainTab | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "likes" || v === "liked") return "liked";
  if (v === "saved")                  return "saved";
  if (v === "collections" || v === "collection") return "collections";
  return null;
}

function CollectionPage() {
  const { items: analysisItems, hydrated, patch } = useCollection();
  const { state: myState } = useMyActivity();
  const searchParams = useSearchParams();

  const initialTab = readTabParam(searchParams.get("tab")) ?? "saved";
  const [activeTab, setActiveTab]         = useState<MainTab>(initialTab);

  // Keep activeTab in sync with the query param when it changes
  // (browser back/forward, or a deep link arriving while mounted).
  useEffect(() => {
    const next = readTabParam(searchParams.get("tab"));
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [sortBy, setSortBy]               = useState<SortKey>("recent");
  const [selectedAnalysis, setSelected]   = useState<CollectionItem | null>(null);
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData]       = useState<MarketIntelligenceData | null>(null);

  const isDemoMode = analysisItems.length === 0 && myState.likes.length === 0 && myState.saved.length === 0;
  const baseAnalysis = isDemoMode ? DEMO_ITEMS : analysisItems;

  /* ── Merge all artworks ── */
  const allDisplay: DisplayArtwork[] = useMemo(() => {
    const map = new Map<string, DisplayArtwork>();
    // From analysis
    baseAnalysis.forEach(i => map.set(i.id, fromAnalysis(i)));
    // From MyActivity likes — merge or add
    myState.likes.forEach(a => {
      if (map.has(a.artwork_id)) {
        map.get(a.artwork_id)!.liked = true;
      } else {
        map.set(a.artwork_id, fromSavedArtwork(a, true, myState.saved.some(s => s.artwork_id === a.artwork_id), false));
      }
    });
    // From MyActivity saved — merge or add
    myState.saved.forEach(a => {
      if (map.has(a.artwork_id)) {
        map.get(a.artwork_id)!.saved = true;
      } else {
        map.set(a.artwork_id, fromSavedArtwork(a, myState.likes.some(l => l.artwork_id === a.artwork_id), true, false));
      }
    });
    return Array.from(map.values());
  }, [baseAnalysis, myState.likes, myState.saved]);

  const likedItems  = useMemo(() => sortArtworks(allDisplay.filter(i => i.liked),  sortBy), [allDisplay, sortBy]);
  const savedItems  = useMemo(() => sortArtworks(allDisplay.filter(i => i.saved),  sortBy), [allDisplay, sortBy]);
  const collections = myState.collections;

  /* ── Taste signal from all liked+saved ── */
  const tasteItems  = useMemo(() => [...new Map(allDisplay.map(i => [i.id, i])).values()], [allDisplay]);
  const signal      = useMemo(() => computeTasteSignal(tasteItems), [tasteItems]);

  /* ── Counts ── */
  const counts: Record<MainTab, number> = {
    liked: likedItems.length,
    saved: savedItems.length,
    collections: collections.length,
  };

  /* ── Full report ── */
  const handleFullReport = useCallback(async () => {
    if (!selectedAnalysis) return;
    setReportLoading(true); setReportData(null);
    try {
      const res  = await fetch("/api/market-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysis: selectedAnalysis.analysis }) });
      const json = await res.json();
      if (json.success) setReportData(json.data as MarketIntelligenceData);
    } catch { /* silent */ }
    finally { setReportLoading(false); }
  }, [selectedAnalysis]);

  /* ── QuickReport view ── */
  if (selectedAnalysis) {
    return (
      <QuickReport
        analysis={selectedAnalysis.analysis}
        imagePreview={selectedAnalysis.imagePreview ?? null}
        sourceType="text"
        onReset={() => { setSelected(null); setReportData(null); setReportLoading(false); }}
        onFullReport={handleFullReport}
        reportLoading={reportLoading}
        reportData={reportData}
      />
    );
  }

  /* ── Collection detail view ── */
  const activeCol = selectedColId ? collections.find(c => c.collection_id === selectedColId) : null;
  if (activeCol) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />
        <div style={{ maxWidth: 640, margin: "0 auto", background: "#FFF", minHeight: "100vh", fontFamily: F }}>
          <CollectionGroupDetail
            col={activeCol}
            analysisItems={analysisItems}
            onBack={() => setSelectedColId(null)}
            onSelectArtwork={item => { setSelectedColId(null); setSelected(item); }}
          />
        </div>
        <BottomNav currentTab="collection" />
      </>
    );
  }

  /* ── Artwork click handler ── */
  const handleCardClick = (a: DisplayArtwork) => {
    if (a.analysisItem) setSelected(a.analysisItem);
  };

  /* ── Main view ── */
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />
      <div style={{ maxWidth: 640, margin: "0 auto", background: "#FFF", minHeight: "100vh", fontFamily: F, boxSizing: "border-box", overflowX: "hidden", paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ padding: "60px 24px 0" }}>
          <a
            href="/"
            style={{
              display: "inline-block",
              fontSize: 9, color: "#8A6A3F",
              letterSpacing: ".22em", textTransform: "uppercase",
              margin: "0 0 14px", textDecoration: "none",
              fontFamily: F,
            }}
          >
            ARTENA AI
          </a>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px", fontFamily: FH, letterSpacing: "-.025em", lineHeight: 1 }}>
            Collection
          </h1>
          <p style={{ fontSize: 13, color: "#AAAAAA", margin: 0, letterSpacing: ".01em" }}>
            Your saved artworks, likes, and curated collections
          </p>
          {isDemoMode && (
            <p style={{ fontSize: 10, color: "#C8B87C", margin: "10px 0 0", letterSpacing: ".04em" }}>
              DEMO — /analyze에서 작품을 저장하면 실제 컬렉션이 쌓입니다
            </p>
          )}
        </div>

        <div style={{ padding: "0 24px" }}>

          {/* Taste Signal Summary */}
          <div style={{ marginTop: 28 }}>
            <TasteSignalSummary
              signal={signal}
              likedCount={isDemoMode ? DEMO_ITEMS.filter(i => i.liked).length : counts.liked}
              savedCount={isDemoMode ? DEMO_ITEMS.filter(i => i.saved).length : counts.saved}
              colCount={collections.length}
            />
          </div>

          {/* Main Tabs */}
          <div style={{ marginTop: 24 }}>
            <MainTabBar active={activeTab} onSelect={t => { setActiveTab(t); setSortBy("recent"); }} counts={counts} />
          </div>

          {/* Sort bar (hidden for collections tab) */}
          {activeTab !== "collections" && <SortBar active={sortBy} onChange={setSortBy} />}

          {/* Tab content */}
          <div style={{ paddingTop: 20 }}>

            {activeTab === "saved" && (
              !hydrated
                ? <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><div style={{ width: 20, height: 20, border: "1.5px solid #EEE", borderTop: "1.5px solid #888", borderRadius: "50%", animation: "col-spin 0.8s linear infinite" }} /></div>
                : savedItems.length === 0
                  ? <EmptyTabState text="아직 저장한 작품이 없습니다" sub="나중에 다시 보고 싶은 작품을 저장해보세요" />
                  : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      {savedItems.map(a => <div key={a.id} className="col-card"><ArtworkCard artwork={a} onClick={() => handleCardClick(a)} /></div>)}
                    </div>
            )}

            {activeTab === "liked" && (
              !hydrated
                ? <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><div style={{ width: 20, height: 20, border: "1.5px solid #EEE", borderTop: "1.5px solid #888", borderRadius: "50%", animation: "col-spin 0.8s linear infinite" }} /></div>
                : likedItems.length === 0
                  ? <EmptyTabState text="아직 좋아요한 작품이 없습니다" sub="마음에 드는 작품에 좋아요를 눌러 취향을 남겨보세요" />
                  : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                      {likedItems.map(a => <div key={a.id} className="col-card"><ArtworkCard artwork={a} onClick={() => handleCardClick(a)} /></div>)}
                    </div>
            )}

            {activeTab === "collections" && (
              collections.length === 0
                ? <EmptyTabState text="아직 만든 컬렉션이 없습니다" sub="작품을 주제별로 묶어 나만의 컬렉션을 만들어보세요" />
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                    {collections.map(c => (
                      <div key={c.collection_id} className="col-card">
                        <CollectionGroupCard col={c} onClick={() => setSelectedColId(c.collection_id)} />
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav currentTab="collection" />
      <style>{`@keyframes col-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

export { CollectionPage as CollectionPageContent };

/**
 * Default export — wrapped in Suspense because CollectionPage uses
 * useSearchParams() to honor the ?tab= query param on standalone
 * `/collection` deep links. The named CollectionPageContent export
 * stays unwrapped so the analyze shell composes it as before.
 */
export default function CollectionPageRoute() {
  return (
    <Suspense fallback={null}>
      <CollectionPage />
    </Suspense>
  );
}
