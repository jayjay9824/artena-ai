"use client";
import React, { useState, useCallback, useEffect } from "react";
import { MarketIntelligenceReport, MarketIntelligenceData } from "./MarketIntelligenceReport";
import { ArtAssistantScreen } from "./assistant/ArtAssistantScreen";
import {
  useCollection, makeItemId,
  CollectionAnalysis,
  CollectionAuction, CollectionWork, CollectionMuseum, CollectionCritic, CollectionExhibition,
} from "../../collection/hooks/useCollection";
import { useMyActivity, SavedArtwork } from "../../context/MyActivityContext";
import { useTabNav } from "../../context/TabContext";
import { CollectionPicker } from "../../my/CollectionPicker";
import { trackEvent as track } from "../lib/analytics";
import { getQuickReportChips } from "../lib/suggestedQuestions";
import type { QuestionType } from "../../types/assistant";

/* ── Types ───────────────────────────────────────────────────── */

type Work       = CollectionWork;
type Auction    = CollectionAuction;
type Collection = CollectionMuseum;
type Critic     = CollectionCritic;
type Exhibition = CollectionExhibition;

export type QRAnalysis = CollectionAnalysis;

export interface QuickReportProps {
  analysis: QRAnalysis;
  imagePreview: string | null;
  sourceType: "image" | "camera" | "text";
  onReset: () => void;
  onFullReport: () => void;
  reportLoading: boolean;
  reportData: MarketIntelligenceData | null;
  /**
   * If set, the share button posts /report/<id> instead of just the
   * artwork title. Pass this once the analysis has been persisted via
   * saveReport().
   */
  reportId?: string;
}

/* ── Analytics ───────────────────────────────────────────────── */

type TrackableEvent =
  | "artwork_liked" | "artwork_unliked"
  | "artwork_saved" | "artwork_unsaved"
  | "artwork_added_to_collection"
  | "view_collection_clicked"
  | "ask_artena_clicked"
  | "artwork_shared";

function trackEvent(event: TrackableEvent, artworkId: string) {
  track(event, { artworkId });
}

/* ── Mock data ───────────────────────────────────────────────── */

export const MOCK_ANALYSIS: QRAnalysis = {
  title: "Who's Iconic? (Spanish Identity)",
  artist: "Simon Fujiwara",
  year: "2022",
  style: "Contemporary / Identity Politics",
  description: "아이코닉함의 의미를 비판적으로 해체하고 재구축하는 작업. 소비문화와 미디어 이미지의 문법을 차용해 정체성 정치학을 탐구하며, 팝아트의 시각 언어를 아이러니하게 전복시킨다.",
  emotions: { calm: 35, heavy: 75, warm: 45, inward: 80, movement: 25 },
  colorPalette: ["Carbon Black", "Warm White", "Pastel Blue"],
  keywords: ["정체성", "아이코닉", "소비문화", "팝아트", "비판적 탐구"],
  marketNote: "갤러리 및 기관 중심의 1차 시장이 강하게 형성된 작가입니다. 2차 경매 시장 데이터는 제한적이지만 Pace Gallery, Esther Schipper 등 주요 갤러리와의 협력이 시장 신뢰도를 뒷받침합니다.",
  works: [
    { title: "Who the Bær", year: "2019", medium: "Charcoal, pastel and ink", location: "Tate Modern, London" },
    { title: "Hope House", year: "2017–18", medium: "Mixed media installation", location: "Fondazione Prada, Milan" },
  ],
  auctions: [
    { date: "2023-06", work: "Who the Bær (Bear)", house: "Christie's", result: "$28,000", estimate: "$20K–$35K", note: "" },
    { date: "2022-11", work: "Untitled (Identity)", house: "Phillips", result: "$18,500", estimate: "$15K–$25K", note: "상회 낙찰" },
    { date: "2021-10", work: "Iconic Fragment", house: "Sotheby's", result: "$12,000", estimate: "$10K–$18K", note: "" },
  ],
  collections: [
    { inst: "Tate Modern", city: "London", period: "2019–현재", work: "Who the Bær" },
    { inst: "Fondazione Prada", city: "Milan", period: "2018–현재", work: "Hope House" },
  ],
  critics: [],
  exhibitions: [],
};

/* ── Utility functions ───────────────────────────────────────── */

function isArchitecture(a: QRAnalysis) { return a.category === "architecture"; }
function isArtifact(a: QRAnalysis)     { return a.category === "artifact" || a.category === "cultural_site"; }

function artistLabel(a: QRAnalysis): string {
  if (isArchitecture(a)) return "건축가";
  if (isArtifact(a)) return "제작 주체";
  return "작가";
}

function artistFallback(a: QRAnalysis): string {
  if (isArchitecture(a)) return "건축가 미상";
  if (isArtifact(a)) return "제작자 미상";
  return "Unknown Artist";
}

function deriveMarketPosition(a: QRAnalysis): "Emerging" | "Established" | "Blue-chip" {
  if (isArchitecture(a) || isArtifact(a)) return "Established";
  const note = (a.marketNote ?? "").toLowerCase();
  const auCount = a.auctions?.length ?? 0;
  const colCount = a.collections?.length ?? 0;
  if (note.includes("blue-chip") || (auCount >= 6 && colCount >= 5)) return "Blue-chip";
  if (note.includes("emerging") || note.includes("신진") || (auCount === 0 && colCount <= 1)) return "Emerging";
  return "Established";
}

function deriveConfidence(a: QRAnalysis): number {
  const au = Math.min((a.auctions?.length    ?? 0) * 9, 36);
  const co = Math.min((a.collections?.length ?? 0) * 5, 20);
  const wo = Math.min((a.works?.length       ?? 0) * 4, 16);
  const cr = Math.min((a.critics?.length     ?? 0) * 3, 12);
  return Math.min(Math.round(24 + au + co + wo + cr), 94);
}

function parseUSD(s: string): number | null {
  const cleaned = s.replace(/,/g, "");
  const m = cleaned.match(/([\d.]+)\s*[KkMm]?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  if (/[Kk]$/.test(cleaned)) return n * 1000;
  if (/[Mm]$/.test(cleaned)) return n * 1_000_000;
  return n > 0 ? n : null;
}

function derivePriceRange(a: QRAnalysis): string {
  if (isArchitecture(a)) return "해당 없음";
  const prices = (a.auctions ?? [])
    .map(au => parseUSD(au.result))
    .filter((p): p is number => p !== null)
    .sort((x, y) => x - y);
  if (prices.length === 0) return "공개 데이터 없음";
  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
  return prices.length === 1 ? fmt(prices[0]) : `${fmt(prices[0])} – ${fmt(prices[prices.length - 1])}`;
}

function deriveInsightBullets(a: QRAnalysis): string[] {
  const bullets: string[] = [];
  const kw = (a.keywords ?? []).slice(0, 3);
  if (isArchitecture(a)) {
    if (a.style) bullets.push(`${a.style} — 건축 양식`);
    if (kw.length > 0) bullets.push(`특징: ${kw.join(" · ")}`);
    const dominant = Object.entries(a.emotions ?? {}).sort((x, y) => y[1] - x[1])[0];
    if (dominant) {
      const lbl: Record<string, string> = { calm: "정적·절제", heavy: "중후함", warm: "온기", inward: "내향적", movement: "역동성" };
      bullets.push(`공간 감성: ${lbl[dominant[0]] ?? dominant[0]} (${dominant[1]}/100)`);
    }
  } else if (isArtifact(a)) {
    if (a.style) bullets.push(`${a.style}`);
    if (kw.length > 0) bullets.push(`핵심 특성: ${kw.join(" · ")}`);
    const col = a.collections?.[0];
    if (col) bullets.push(`소장: ${col.inst}, ${col.city}`);
  } else {
    if (a.style) bullets.push(`${a.style} 계열 — 기관 및 갤러리 중심으로 활동`);
    if (kw.length > 0) bullets.push(`핵심 개념: ${kw.join(" · ")}`);
    const dominant = Object.entries(a.emotions ?? {}).sort((x, y) => y[1] - x[1])[0];
    if (dominant) {
      const lbl: Record<string, string> = { calm: "차분함", heavy: "중량감", warm: "온기", inward: "내향성", movement: "동세" };
      bullets.push(`지배적 감성: ${lbl[dominant[0]] ?? dominant[0]} (${dominant[1]}/100)`);
    }
  }
  return bullets.slice(0, 3);
}

/* ── SVG icons ───────────────────────────────────────────────── */

function IcoHeart({ filled, size = 20, color }: { filled: boolean; size?: number; color?: string }) {
  const c = color ?? (filled ? "#D94040" : "rgba(255,255,255,0.82)");
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? c : "none"} stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17C10 17 2.5 12 2.5 6.5A4 4 0 0 1 10 5.2 4 4 0 0 1 17.5 6.5C17.5 12 10 17 10 17Z" />
    </svg>
  );
}

function IcoBookmark({ filled, size = 18, color }: { filled: boolean; size?: number; color?: string }) {
  const c = color ?? (filled ? "#fff" : "#111");
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? c : "none"} stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h10a1 1 0 0 1 1 1v15l-6-3.5L4 18V3a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function IcoFolder({ filled, size = 18, color }: { filled: boolean; size?: number; color?: string }) {
  const c = color ?? (filled ? "#fff" : "#111");
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? c : "none"} stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6h6l2 2h8v9H2V6Z" />
    </svg>
  );
}

function IcoGrid({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.3">
      <rect x="1" y="1" width="5" height="5" rx="1" />
      <rect x="8" y="1" width="5" height="5" rx="1" />
      <rect x="1" y="8" width="5" height="5" rx="1" />
      <rect x="8" y="8" width="5" height="5" rx="1" />
    </svg>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 9, color: "#AAA", letterSpacing: ".22em", textTransform: "uppercase" as const, margin: "0 0 16px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
      {text}
    </p>
  );
}

function ScoreBar({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const color = value >= 65 ? "#8A6A3F" : value >= 40 ? "#555" : "#C09040";
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "#777", wordBreak: "keep-all" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color, flexShrink: 0, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "#F2F2F2" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, transition: `width 0.85s cubic-bezier(0.4,0,0.2,1) ${delay}ms` }} />
      </div>
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────────────── */

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function ActionToast({
  toast, onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px",
      background: "#111",
      borderBottom: "0.5px solid #222",
      animation: "toastSlideDown 0.28s ease",
    }}>
      <span style={{ fontSize: 13, color: "#fff", letterSpacing: ".01em" }}>
        {toast.message}
      </span>
      {toast.actionLabel && toast.onAction && (
        <button
          onClick={() => { toast.onAction!(); onDismiss(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 0 4px 16px",
            flexShrink: 0,
          }}
        >
          <IcoGrid color="#8A6A3F" />
          <span style={{ fontSize: 12, color: "#8A6A3F", fontWeight: 600, fontFamily: "'KakaoSmallSans', system-ui, sans-serif", letterSpacing: ".02em" }}>
            {toast.actionLabel}
          </span>
        </button>
      )}
    </div>
  );
}

/* ── CSS ─────────────────────────────────────────────────────── */

const QR_STYLES = `
  @keyframes qr-spin        { to { transform: rotate(360deg); } }
  @keyframes heartPop       { 0% { transform: scale(1); } 40% { transform: scale(1.32); } 70% { transform: scale(0.92); } 100% { transform: scale(1); } }
  @keyframes toastSlideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  /* Receiving end of the scanner's spatial zoom — hero image stays
     immediate, everything else fades in over the captured frame.
     Opacity-only so it doesn't clobber transform-based positioning
     (e.g., the fixed action bar uses translateX(-50%) to center). */
  @keyframes qrTextFadeIn   { from { opacity: 0; } to { opacity: 1; } }
  .qr-content               { animation: qrTextFadeIn 0.36s ease-out 0.05s both; }
  .qr-full-btn:hover        { background: #F5F5F5 !important; }
  .qr-ask-btn:hover         { opacity: .84 !important; }
  .qr-save-btn:active       { opacity: .78; }
  .qr-collect-btn:active    { opacity: .78; }
`;

/* ── Main component ──────────────────────────────────────────── */

export function QuickReport({
  analysis: a,
  imagePreview,
  onReset,
  onFullReport,
  reportLoading,
  reportData,
  reportId,
}: QuickReportProps) {
  const [actions, setActions] = useState({ liked: false, saved: false, collected: false });
  const [heartAnim, setHeartAnim]     = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [toast, setToast]             = useState<ToastState | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<{ text: string; type: QuestionType } | null>(null);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);

  const { items, upsert, patch }           = useCollection();
  const itemId                              = makeItemId(a.artist, a.title);
  const { isLiked, isSaved, like, unlike, save, unsave, addRecentlyViewed } = useMyActivity();
  const { goTo }                            = useTabNav();

  const artwork: SavedArtwork = {
    artwork_id: itemId,
    image_url:   imagePreview ?? null,
    artist_name: a.artist ?? "Unknown",
    title:       a.title  ?? "Untitled",
    year:        a.year   ?? "",
    gallery_name: "",
    source: "analysis",
    status: "not_listed",
  };

  // Auto-add to recently viewed on mount
  useEffect(() => {
    if (a.artist || a.title) addRecentlyViewed(artwork);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // Sync state from collection on mount / itemId change
  useEffect(() => {
    const existing = items.find(i => i.id === itemId);
    if (existing) setActions({ liked: existing.liked, saved: existing.saved, collected: existing.collected });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // Toast helpers
  const showToast = useCallback((msg: string, actionLabel?: string, onAction?: () => void) => {
    setToast({ message: msg, actionLabel, onAction });
    setTimeout(() => setToast(null), 3400);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // Like — instant hero reaction, no toast
  const toggleLike = useCallback(() => {
    setActions(prev => {
      const next = !prev.liked;
      const isNew = !items.find(i => i.id === itemId);
      if (isNew) upsert({ id: itemId, savedAt: new Date().toISOString(), liked: next, saved: prev.saved, collected: prev.collected, analysis: a, imagePreview: imagePreview ?? null });
      else        patch(itemId, { liked: next });
      if (next) { like(artwork, undefined); trackEvent("artwork_liked", itemId); }
      else      { unlike(artwork.artwork_id); trackEvent("artwork_unliked", itemId); }
      return { ...prev, liked: next };
    });
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, items, a, imagePreview]);

  // Save — shows "컬렉션 보기" toast
  const toggleSave = useCallback(() => {
    setActions(prev => {
      const next = !prev.saved;
      const isNew = !items.find(i => i.id === itemId);
      if (isNew) upsert({ id: itemId, savedAt: new Date().toISOString(), liked: prev.liked, saved: next, collected: prev.collected, analysis: a, imagePreview: imagePreview ?? null });
      else        patch(itemId, { saved: next });
      if (next) {
        save(artwork, undefined);
        trackEvent("artwork_saved", itemId);
        showToast("저장되었습니다", "컬렉션 보기", () => { trackEvent("view_collection_clicked", itemId); goTo("collection"); });
      } else {
        unsave(artwork.artwork_id);
        trackEvent("artwork_unsaved", itemId);
      }
      return { ...prev, saved: next };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, items, a, imagePreview, showToast, goTo]);

  // Collection — opens picker
  const openCollectionPicker = useCallback(() => {
    setShowCollectionPicker(true);
    const isNew = !items.find(i => i.id === itemId);
    if (isNew) upsert({ id: itemId, savedAt: new Date().toISOString(), liked: actions.liked, saved: actions.saved, collected: true, analysis: a, imagePreview: imagePreview ?? null });
    else patch(itemId, { collected: true });
    setActions(prev => ({ ...prev, collected: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, items, a, imagePreview, actions]);

  const onCollectionDone = useCallback(() => {
    setShowCollectionPicker(false);
    trackEvent("artwork_added_to_collection", itemId);
    showToast("컬렉션에 추가되었습니다", "컬렉션 보기", () => { trackEvent("view_collection_clicked", itemId); goTo("collection"); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, showToast, goTo]);

  const position   = deriveMarketPosition(a);
  const confidence = deriveConfidence(a);
  const priceRange = derivePriceRange(a);
  const bullets    = deriveInsightBullets(a);
  const dataDepth  = Math.min(confidence + 5, 94);
  const comparable = Math.max(confidence - 8, 22);
  const stability  = Math.round(confidence * 0.87);
  const posColor   = position === "Blue-chip" ? "#8A6A3F" : position === "Emerging" ? "#B07030" : "#111";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: QR_STYLES }} />
      <div style={{
        maxWidth: 640, margin: "0 auto", background: "#FFFFFF",
        minHeight: "100vh", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        position: "relative" as const, paddingBottom: 200,
        boxSizing: "border-box" as const, overflowX: "hidden",
      }}>

        {/* ── 1. Artwork Hero ────────────────────────────────────── */}
        <div style={{ position: "relative" as const, width: "100%", minHeight: 280, background: "#111", overflow: "hidden" }}>
          {imagePreview ? (
            <img src={imagePreview} alt={a.title} style={{ width: "100%", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: 360, background: "linear-gradient(155deg, #161616 0%, #2a2a2a 55%, #161616 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 72, opacity: 0.08, userSelect: "none" }}>◆</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div style={{ position: "absolute" as const, inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.88) 100%)" }} />

          {/* Top nav */}
          <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "52px 18px 0" }}>
            {/* Back button */}
            <button
              onClick={onReset}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 16px 9px 11px",
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                border: "none", borderRadius: 24, cursor: "pointer",
                boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7L9 12" stroke="#111" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", letterSpacing: "-.01em" }}>뒤로</span>
            </button>

            {/* Right actions: Like + Share */}
            <div style={{ display: "flex", gap: 8 }}>
              {/* Heart / Like button — primary right action */}
              <button
                onClick={toggleLike}
                style={{
                  width: 40, height: 40,
                  borderRadius: "50%",
                  background: actions.liked ? "rgba(217,64,64,0.18)" : "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                  border: actions.liked ? "1px solid rgba(217,64,64,0.35)" : "none",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
                  animation: heartAnim ? "heartPop 0.4s ease" : "none",
                  transition: "background 0.2s, border 0.2s",
                }}
              >
                <IcoHeart filled={actions.liked} size={18} color={actions.liked ? "#D94040" : "#111"} />
              </button>

              {/* Share button */}
              <button
                style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}
                onClick={async () => {
                  // Build share URL only when the report has been persisted.
                  // Without an id we can't deep-link, so fall back to a
                  // text-only share or clipboard copy of the title.
                  const url = reportId && typeof window !== "undefined"
                    ? `${window.location.origin}/report/${reportId}`
                    : null;
                  // Spec format: "ARTENA AI 분석 리포트: {artist} - {title}"
                  const artistText = a.artist || artistFallback(a);
                  const titleText  = a.title  || "Untitled";
                  const shareTitle = "ARTENA AI 분석 리포트";
                  const shareText  = `ARTENA AI 분석 리포트: ${artistText} - ${titleText}`;
                  trackEvent("artwork_shared", itemId);
                  if (typeof navigator !== "undefined" && navigator.share) {
                    try {
                      await navigator.share({ title: shareTitle, text: shareText, ...(url ? { url } : {}) });
                      return;
                    } catch {
                      /* user dismissed — fall through to clipboard */
                    }
                  }
                  if (url && typeof navigator !== "undefined" && navigator.clipboard) {
                    try {
                      await navigator.clipboard.writeText(url);
                      setToast({ message: "링크가 복사되었습니다" });
                      setTimeout(() => setToast(null), 2400);
                    } catch { /* noop */ }
                  }
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M10 2L13.5 5.5L10 9" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.5 5.5H5.5C4.1 5.5 3 6.6 3 8V13" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Artwork info — bottom of hero */}
          <div style={{ position: "absolute" as const, bottom: 0, left: 0, right: 0, padding: "0 22px 28px" }}>
            <a href="/" style={{ display: "inline-block", fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: ".22em", textTransform: "uppercase" as const, margin: "0 0 10px", textDecoration: "none" }}>
              ARTENA AI
            </a>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#FFF", margin: "0 0 5px", lineHeight: 1.2, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
              {a.artist || artistFallback(a)}
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", margin: "0 0 8px", fontStyle: "italic" }}>
              {a.title || "Untitled"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", margin: 0 }}>
              {[a.year, a.style].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="qr-content" style={{ padding: "0 22px" }}>

          {/* ── 2. ARTENA Insight ────────────────────────────────── */}
          <div style={{ paddingTop: 32, paddingBottom: 28, borderBottom: "0.5px solid #F0F0F0" }}>
            <SectionLabel text="아르테나 인사이트" />

            {a.description && (() => {
              const TRUNC = 150;
              const isLong = a.description.length > TRUNC;
              const text = !isLong || analysisExpanded
                ? a.description
                : a.description.slice(0, TRUNC) + "…";
              return (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#111", lineHeight: 1.78, margin: 0 }}>
                    {text}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => setAnalysisExpanded(v => !v)}
                      style={{
                        marginTop: 10,
                        padding: "6px 0", border: "none", background: "transparent",
                        color: "#8A6A3F", fontSize: 11.5, fontWeight: 600,
                        letterSpacing: ".04em", cursor: "pointer",
                        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                      }}
                    >
                      {analysisExpanded ? "접기 ↑" : "더 보기 ↓"}
                    </button>
                  )}
                </div>
              );
            })()}

            <div style={{ display: "flex", flexDirection: "column" as const, gap: 11, marginBottom: 20 }}>
              {bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span style={{ color: "#8A6A3F", fontSize: 7, marginTop: 6, flexShrink: 0 }}>◆</span>
                  <span style={{ fontSize: 12, color: "#555", lineHeight: 1.68 }}>{b}</span>
                </div>
              ))}
            </div>

            {(a.keywords ?? []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                {(a.keywords ?? []).slice(0, 5).map((k) => (
                  <span key={k} style={{ fontSize: 10, color: "#888", background: "#F6F6F6", padding: "4px 10px", letterSpacing: ".02em" }}>
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── 3. Market Intelligence ───────────────────────────── */}
          <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "0.5px solid #F0F0F0" }}>
            <SectionLabel text={isArchitecture(a) || isArtifact(a) ? "문화유산 인텔리전스" : "시장 인텔리전스"} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", margin: "0 0 6px" }}>
                  {isArchitecture(a) ? "유산 가치" : isArtifact(a) ? "문화재 등급" : "MARKET POSITION"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: posColor, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
                    {isArchitecture(a) ? "공적 자산" : isArtifact(a) ? "문화유산" : position}
                  </span>
                  <span style={{ fontSize: 10, color: posColor, background: posColor + "18", padding: "2px 8px", letterSpacing: ".06em" }}>
                    {isArchitecture(a) || isArtifact(a) ? "◆" : position === "Blue-chip" ? "●" : position === "Emerging" ? "◎" : "◆"}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", margin: "0 0 4px" }}>CONFIDENCE</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#111", fontFamily: "'KakaoBigSans', system-ui, sans-serif", lineHeight: 1 }}>{confidence}</span>
                  <span style={{ fontSize: 13, color: "#CCC", marginBottom: 2 }}>/100</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "14px 16px", background: "#F8F8F8", marginBottom: 24 }}>
              <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".18em", margin: "0 0 6px" }}>
                {isArchitecture(a) ? "시장 거래" : isArtifact(a) ? "경매 기록" : "ESTIMATED RANGE"}
              </p>
              <p style={{ fontSize: isArchitecture(a) ? 14 : 22, fontWeight: 800, color: isArchitecture(a) ? "#888" : "#111", margin: 0, fontFamily: "'KakaoBigSans', system-ui, sans-serif", letterSpacing: "-.02em" }}>
                {priceRange}
              </p>
            </div>

            <div style={{ marginBottom: 22 }}>
              <ScoreBar label="데이터 깊이"     value={dataDepth}  delay={0}   />
              <ScoreBar label="Comparable 매칭" value={comparable} delay={80}  />
              <ScoreBar label="시장 안정성"     value={stability}  delay={160} />
            </div>

            {a.marketNote && (
              <p style={{ fontSize: 12, color: "#666", lineHeight: 1.78, margin: 0, paddingLeft: 14, borderLeft: "2px solid #8A6A3F" }}>
                {a.marketNote.length > 160 ? a.marketNote.slice(0, 160) + "…" : a.marketNote}
              </p>
            )}
          </div>

          {/* ── Full Report CTA ───────────────────────────────────── */}
          <div style={{ paddingTop: 22, paddingBottom: 22, borderBottom: "0.5px solid #F0F0F0" }}>
            <button
              onClick={onFullReport}
              disabled={reportLoading}
              className="qr-full-btn"
              style={{
                width: "100%", padding: "13px 0", background: "#FAFAFA",
                border: "1px solid #E8E8E8", color: "#555", cursor: reportLoading ? "default" : "pointer",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 11, letterSpacing: ".08em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                transition: "background .15s",
              }}
            >
              {reportLoading ? (
                <>
                  <div style={{ width: 13, height: 13, border: "1.5px solid #DDD", borderTop: "1.5px solid #666", borderRadius: "50%", animation: "qr-spin 0.8s linear infinite" }} />
                  <span>리포트 생성 중 · 약 20-30초...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="1" width="10" height="10" rx="1" stroke="#999" strokeWidth="1.2" />
                    <path d="M3.5 4h5M3.5 6h5M3.5 8h3" stroke="#999" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span>전체 Market Intelligence Report</span>
                  <span style={{ color: "#CCC" }}>→</span>
                </>
              )}
            </button>
          </div>

          {/* Report output */}
          {reportData && (
            <div style={{ paddingTop: 24 }}>
              <MarketIntelligenceReport data={reportData} imagePreview={imagePreview} />
            </div>
          )}

          {/* Reset link */}
          <div style={{ paddingTop: 24, paddingBottom: 12, display: "flex", justifyContent: "center" as const }}>
            <button
              onClick={onReset}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "#F4F4F4", border: "0.5px solid #E4E4E4",
                borderRadius: 24, padding: "11px 22px", cursor: "pointer",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                fontSize: 12, color: "#444", letterSpacing: ".02em", fontWeight: 500,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8.5 1.5L3.5 6.5L8.5 11.5" stroke="#444" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              새 작품 분석하기
            </button>
          </div>
        </div>

        {/* ── 4. Action Bar (fixed) ─────────────────────────────────── */}
        <div className="qr-content" style={{
          position: "fixed" as const, bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 640,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderTop: "0.5px solid #E8E8E8",
          boxShadow: "0 -4px 28px rgba(0,0,0,0.07)",
          zIndex: 100,
        }}>

          {/* Toast — slides in above the actions */}
          {toast && <ActionToast toast={toast} onDismiss={dismissToast} />}

          {/* Primary: Save + Collection */}
          <div style={{ display: "flex", gap: 9, padding: "14px 18px 10px" }}>
            {/* Save button */}
            <button
              onClick={toggleSave}
              className="qr-save-btn"
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "13px 0",
                background: actions.saved ? "#8A6A3F" : "#fff",
                border: `1px solid ${actions.saved ? "#8A6A3F" : "#D8D8D8"}`,
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                transition: "background .2s, border .2s",
              }}
            >
              <IcoBookmark filled={actions.saved} size={17} color={actions.saved ? "#fff" : "#111"} />
              <span style={{ fontSize: 13, fontWeight: 600, color: actions.saved ? "#fff" : "#111", letterSpacing: ".01em" }}>
                {actions.saved ? "저장됨" : "저장하기"}
              </span>
            </button>

            {/* Collection button */}
            <button
              onClick={openCollectionPicker}
              className="qr-collect-btn"
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "13px 0",
                background: actions.collected ? "#111" : "#fff",
                border: `1px solid ${actions.collected ? "#111" : "#D8D8D8"}`,
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                transition: "background .2s, border .2s",
              }}
            >
              <IcoFolder filled={actions.collected} size={17} color={actions.collected ? "#fff" : "#111"} />
              <span style={{ fontSize: 13, fontWeight: 600, color: actions.collected ? "#fff" : "#111", letterSpacing: ".01em" }}>
                컬렉션에 추가
              </span>
            </button>
          </div>

          {/* Contextual question chips — tap to open Ask with that question
              already submitted. Same logic as the chat empty-state, but
              trimmed to 3 picks for the QuickReport surface. */}
          {(() => {
            const chips = getQuickReportChips(a);
            if (chips.length === 0) return null;
            return (
              <div style={{
                padding: "8px 18px 4px",
                display: "flex", flexWrap: "wrap" as const, gap: 7,
              }}>
                {chips.map(q => (
                  <button
                    key={q.text}
                    onClick={() => {
                      setPendingQuestion({ text: q.text, type: q.type });
                      setShowAssistant(true);
                      trackEvent("ask_artena_clicked", itemId);
                    }}
                    style={{
                      padding: "8px 14px",
                      background: "#FFFFFF",
                      border: "0.5px solid #E7E2D8",
                      borderRadius: 22,
                      cursor: "pointer",
                      fontSize: 12, color: "#1C1A17",
                      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                      letterSpacing: "-.005em",
                      lineHeight: 1.3,
                      transition: "background .12s, border-color .12s, transform .12s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F4EFE5"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#D9C9A6"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#E7E2D8"; }}
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Secondary: Ask ARTENA */}
          <div style={{ padding: "8px 18px 24px" }}>
            <button
              onClick={() => { setPendingQuestion(null); setShowAssistant(true); trackEvent("ask_artena_clicked", itemId); }}
              className="qr-ask-btn"
              style={{
                width: "100%", padding: "13px 0",
                background: "#0F0F0F", border: "none",
                borderRadius: 10, cursor: "pointer",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3,
                transition: "opacity .15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 9, color: "#8A6A3F" }}>◆</span>
                <span style={{ fontSize: 12, color: "#FFF", letterSpacing: ".07em" }}>아르테나 AI에게 더 물어보기</span>
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", letterSpacing: ".03em" }}>
                이 작품을 더 깊이 이해해보세요
              </span>
            </button>
          </div>
        </div>

        {/* Collection Picker */}
        {showCollectionPicker && (
          <CollectionPicker
            artwork={artwork}
            onClose={() => setShowCollectionPicker(false)}
            onDone={onCollectionDone}
          />
        )}
      </div>

      {/* AI Assistant overlay */}
      {showAssistant && (
        <ArtAssistantScreen
          analysis={a}
          imagePreview={imagePreview}
          reportData={reportData}
          onClose={() => { setShowAssistant(false); setPendingQuestion(null); }}
          initialQuestion={pendingQuestion ?? undefined}
        />
      )}
    </>
  );
}
