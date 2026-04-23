"use client";
import React, { useState, useCallback } from "react";
import { MarketIntelligenceReport, MarketIntelligenceData } from "./MarketIntelligenceReport";

/* ── Types ───────────────────────────────────────────────────── */

interface Work       { title: string; year: string; medium: string; location: string; }
interface Auction    { date: string; work: string; house: string; result: string; estimate: string; note: string; }
interface Collection { inst: string; city: string; period: string; work: string; }
interface Critic     { critic: string; source: string; year: string; quote: string; }
interface Exhibition { title: string; venue: string; city: string; year: string; type: string; }

export interface QRAnalysis {
  title?: string;
  artist?: string;
  year?: string;
  style?: string;
  description?: string;
  emotions?: Record<string, number>;
  colorPalette?: string[];
  keywords?: string[];
  marketNote?: string;
  works?: Work[];
  auctions?: Auction[];
  collections?: Collection[];
  critics?: Critic[];
  exhibitions?: Exhibition[];
}

export interface QuickReportProps {
  analysis: QRAnalysis;
  imagePreview: string | null;
  sourceType: "image" | "camera" | "text";
  onReset: () => void;
  onFullReport: () => void;
  reportLoading: boolean;
  reportData: MarketIntelligenceData | null;
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

function deriveMarketPosition(a: QRAnalysis): "Emerging" | "Established" | "Blue-chip" {
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
  const prices = (a.auctions ?? [])
    .map(au => parseUSD(au.result))
    .filter((p): p is number => p !== null)
    .sort((x, y) => x - y);
  if (prices.length === 0) return "공개 데이터 없음";
  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
  return prices.length === 1
    ? fmt(prices[0])
    : `${fmt(prices[0])} – ${fmt(prices[prices.length - 1])}`;
}

function deriveInsightBullets(a: QRAnalysis): string[] {
  const bullets: string[] = [];
  if (a.style) bullets.push(`${a.style} 계열 — 기관 및 갤러리 중심으로 활동`);
  const kw = (a.keywords ?? []).slice(0, 3);
  if (kw.length > 0) bullets.push(`핵심 개념: ${kw.join(" · ")}`);
  const dominant = Object.entries(a.emotions ?? {}).sort((a, b) => b[1] - a[1])[0];
  if (dominant) {
    const lbl: Record<string, string> = { calm: "차분함", heavy: "중량감", warm: "온기", inward: "내향성", movement: "동세" };
    bullets.push(`지배적 감성: ${lbl[dominant[0]] ?? dominant[0]} (${dominant[1]}/100)`);
  }
  return bullets.slice(0, 3);
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
  const color = value >= 65 ? "#1856FF" : value >= 40 ? "#555" : "#C09040";
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "#777", wordBreak: "keep-all" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color, flexShrink: 0, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "#F2F2F2" }}>
        <div
          style={{
            width: `${value}%`, height: "100%", background: color,
            transition: `width 0.85s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

function ActionBtn({
  icon, label, active, activeColor, onClick, primary = false,
}: {
  icon: React.ReactNode; label: string; active: boolean;
  activeColor: string; onClick: () => void; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", flexDirection: "column" as const,
        alignItems: "center", gap: 5, padding: "6px 4px",
        transition: "opacity .15s",
      }}
    >
      <span style={{
        fontSize: primary ? 22 : 20,
        color: active ? activeColor : "#C8C8C8",
        transition: "color .15s, transform .2s",
        display: "block",
        transform: active ? "scale(1.18)" : "scale(1)",
        lineHeight: 1,
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: 10, letterSpacing: ".02em",
        color: active ? activeColor : "#B0B0B0",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        fontWeight: primary ? 600 : 400,
      }}>
        {label}
      </span>
    </button>
  );
}

/* ── CSS ─────────────────────────────────────────────────────── */

const QR_STYLES = `
  @keyframes qr-spin { to { transform: rotate(360deg); } }
  .qr-full-btn:hover { background: #F5F5F5 !important; }
  .qr-ask-btn:hover  { background: #1a1a1a !important; opacity: .88; }
`;

/* ── Main component ──────────────────────────────────────────── */

export function QuickReport({
  analysis: a,
  imagePreview,
  onReset,
  onFullReport,
  reportLoading,
  reportData,
}: QuickReportProps) {
  const [actions, setActions] = useState({ liked: false, saved: false, collected: false });

  const toggle = useCallback((key: "liked" | "saved" | "collected") => {
    setActions(prev => ({ ...prev, [key]: !prev[key] }));
    // Future: logEvent({ type: key, timestamp: new Date().toISOString() })
  }, []);

  const position   = deriveMarketPosition(a);
  const confidence = deriveConfidence(a);
  const priceRange = derivePriceRange(a);
  const bullets    = deriveInsightBullets(a);
  const dataDepth  = Math.min(confidence + 5, 94);
  const comparable = Math.max(confidence - 8, 22);
  const stability  = Math.round(confidence * 0.87);

  const posColor = position === "Blue-chip" ? "#1856FF" : position === "Emerging" ? "#B07030" : "#111";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: QR_STYLES }} />
      <div style={{
        maxWidth: 640, margin: "0 auto", background: "#FFFFFF",
        minHeight: "100vh", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        position: "relative" as const, paddingBottom: 108,
        boxSizing: "border-box" as const, overflowX: "hidden",
      }}>

        {/* ── 1. Artwork Hero ────────────────────────────────── */}
        <div style={{ position: "relative" as const, width: "100%", height: 390, overflow: "hidden", background: "#111" }}>
          {imagePreview ? (
            <img
              src={imagePreview}
              alt={a.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.05)", transformOrigin: "center", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(155deg, #161616 0%, #2a2a2a 55%, #161616 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 72, opacity: 0.08, userSelect: "none" }}>◆</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div style={{ position: "absolute" as const, inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 30%, transparent 48%, rgba(0,0,0,0.86) 100%)" }} />

          {/* Top nav */}
          <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "54px 18px 0" }}>
            <button
              onClick={onReset}
              style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.32)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.32)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
              onClick={() => {
                if (navigator.share) navigator.share({ title: a.artist ?? "", text: a.title ?? "" });
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M10 2L13.5 5.5L10 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.5 5.5H5.5C4.1 5.5 3 6.6 3 8V13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Artwork info */}
          <div style={{ position: "absolute" as const, bottom: 0, left: 0, right: 0, padding: "0 22px 28px" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: ".22em", textTransform: "uppercase" as const, margin: "0 0 10px" }}>
              ARTENA AI
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#FFF", margin: "0 0 5px", lineHeight: 1.2, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
              {a.artist || "Unknown Artist"}
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", margin: "0 0 8px", fontStyle: "italic" }}>
              {a.title || "Untitled"}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", margin: 0 }}>
              {[a.year, a.style].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div style={{ padding: "0 22px" }}>

          {/* ── 2. ARTENA Insight ──────────────────────────────── */}
          <div style={{ paddingTop: 32, paddingBottom: 28, borderBottom: "0.5px solid #F0F0F0" }}>
            <SectionLabel text="아르테나 인사이트" />

            {a.description && (
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111", lineHeight: 1.78, margin: "0 0 20px" }}>
                {a.description.length > 150 ? a.description.slice(0, 150) + "…" : a.description}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column" as const, gap: 11, marginBottom: 20 }}>
              {bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span style={{ color: "#1856FF", fontSize: 7, marginTop: 6, flexShrink: 0 }}>◆</span>
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

          {/* ── 3. Market Intelligence ──────────────────────────── */}
          <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "0.5px solid #F0F0F0" }}>
            <SectionLabel text="시장 인텔리전스" />

            {/* Position + Confidence */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", margin: "0 0 6px" }}>MARKET POSITION</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: posColor, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
                    {position}
                  </span>
                  <span style={{ fontSize: 10, color: posColor, background: posColor + "18", padding: "2px 8px", letterSpacing: ".06em" }}>
                    {position === "Blue-chip" ? "●" : position === "Emerging" ? "◎" : "◆"}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", margin: "0 0 4px" }}>CONFIDENCE</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#111", fontFamily: "'KakaoBigSans', system-ui, sans-serif", lineHeight: 1 }}>
                    {confidence}
                  </span>
                  <span style={{ fontSize: 13, color: "#CCC", marginBottom: 2 }}>/100</span>
                </div>
              </div>
            </div>

            {/* Price range */}
            <div style={{ padding: "14px 16px", background: "#F8F8F8", marginBottom: 24 }}>
              <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".18em", margin: "0 0 6px" }}>ESTIMATED RANGE</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: 0, fontFamily: "'KakaoBigSans', system-ui, sans-serif", letterSpacing: "-.02em" }}>
                {priceRange}
              </p>
            </div>

            {/* Score bars */}
            <div style={{ marginBottom: 22 }}>
              <ScoreBar label="데이터 깊이"     value={dataDepth}  delay={0}   />
              <ScoreBar label="Comparable 매칭" value={comparable} delay={80}  />
              <ScoreBar label="시장 안정성"     value={stability}  delay={160} />
            </div>

            {/* Market context */}
            {a.marketNote && (
              <p style={{ fontSize: 12, color: "#666", lineHeight: 1.78, margin: 0, paddingLeft: 14, borderLeft: "2px solid #1856FF" }}>
                {a.marketNote.length > 160 ? a.marketNote.slice(0, 160) + "…" : a.marketNote}
              </p>
            )}
          </div>

          {/* ── Full Report CTA ──────────────────────────────────── */}
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

          {/* ── Report output ─────────────────────────────────────── */}
          {reportData && (
            <div style={{ paddingTop: 24 }}>
              <MarketIntelligenceReport data={reportData} imagePreview={imagePreview} />
            </div>
          )}

          {/* Reset link */}
          <div style={{ paddingTop: 20, paddingBottom: 8, textAlign: "center" as const }}>
            <button
              onClick={onReset}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#CCC", letterSpacing: ".04em", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}
            >
              ← 새 작품 분석하기
            </button>
          </div>
        </div>

        {/* ── 4. Action Layer (fixed sticky bar) ────────────────── */}
        <div style={{
          position: "fixed" as const, bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 640,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          borderTop: "0.5px solid #EBEBEB",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.07)",
          zIndex: 100,
        }}>
          {/* Primary: like / save / collect */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 24px 4px", gap: 4 }}>
            <ActionBtn
              icon="♡"
              label="좋아요"
              active={actions.liked}
              activeColor="#E04848"
              onClick={() => toggle("liked")}
            />
            <ActionBtn
              icon="◇"
              label="저장하기"
              active={actions.saved}
              activeColor="#1856FF"
              onClick={() => toggle("saved")}
              primary
            />
            <ActionBtn
              icon="△"
              label="컬렉션 추가"
              active={actions.collected}
              activeColor="#3DAA78"
              onClick={() => toggle("collected")}
            />
          </div>

          {/* Secondary: ask */}
          <div style={{ padding: "6px 20px 20px" }}>
            <button
              onClick={onFullReport}
              className="qr-ask-btn"
              style={{
                width: "100%", padding: "12px 0", background: "#0F0F0F",
                border: "none", color: "#FFF", cursor: "pointer",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                fontSize: 11, letterSpacing: ".07em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                transition: "opacity .15s",
              }}
            >
              <span style={{ fontSize: 9, color: "#7C6FF7" }}>◆</span>
              아르테나에게 더 물어보기
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
