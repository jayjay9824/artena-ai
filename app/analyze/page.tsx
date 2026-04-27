"use client";
import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MarketIntelligenceData } from "./components/MarketIntelligenceReport";
import { QuickReport } from "./components/QuickReport";
import { IntroSplash } from "./components/IntroSplash";
import { SmartScanner } from "./components/SmartScanner";
import { HomeScreen } from "./components/home/HomeScreen";
import { useTabNav, AppTab } from "../context/TabContext";
import { BottomNav } from "../components/BottomNav";
import { CollectionPageContent } from "../collection/page";
import { TastePageContent } from "../taste/page";
import { RecommendationsPageContent } from "../recommendations/page";
import { GalleryPageContent } from "../gallery/page";
import { MyPageContent } from "../my/page";
import { saveReport } from "../services/reportService";
import { useCollection } from "../collection/hooks/useCollection";
import type { SourceType } from "../lib/types";

/* ── Types (kept local for the scan analysis shape) ───────────── */

interface Work       { title: string; year: string; medium: string; location: string; }
interface Auction    { date: string; work: string; house: string; result: string; estimate: string; note: string; }
interface Collection { inst: string; city: string; period: string; work: string; }
interface Critic     { critic: string; source: string; year: string; quote: string; }
interface Exhibition { title: string; venue: string; city: string; year: string; type: string; }

interface Analysis {
  title?: string; artist?: string; year?: string; style?: string;
  description?: string; emotions?: Record<string, number>; colorPalette?: string[];
  keywords?: string[]; marketNote?: string;
  works?: Work[]; auctions?: Auction[]; collections?: Collection[];
  critics?: Critic[]; exhibitions?: Exhibition[];
}

/* ── Loading spinner ──────────────────────────────────────────── */

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 20 }}>
      <a
        href="/"
        style={{
          fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
          textTransform: "uppercase", textDecoration: "none",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}
      >
        ARTENA AI
      </a>
      <div style={{ width: 40, height: 40, border: "3px solid #EBE6DB", borderTop: "3px solid #8A6A3F", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>작가와 작품을 ARTENA AI가 분석중입니다</p>
        <p style={{ fontSize: 11, color: "#bbb" }}>시장 데이터, 작품 이력, 경매 기록을 분석하고 있습니다...</p>
      </div>
    </div>
  );
}

/* ── Scan screen ──────────────────────────────────────────────── */

function ScanScreen() {
  const [showIntro,     setShowIntro]     = useState(true);
  const [screen,        setScreen]        = useState("upload");
  const [error,         setError]         = useState<string | null>(null);
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);
  const [pendingFile,   setPendingFile]   = useState<File | null>(null);
  const [analysis,      setAnalysis]      = useState<Analysis | null>(null);
  const [reportType,    setReportType]    = useState<"intelligence" | null>(null);
  const [reportData,    setReportData]    = useState<MarketIntelligenceData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showScanner,   setShowScanner]   = useState(false);
  const [reportId,      setReportId]      = useState<string | null>(null);

  const handleIntroComplete = useCallback(() => setShowIntro(false), []);

  // Deep-link: ?artworkId=… restores a previously-analysed artwork
  // from the local Collection store. Skips intro and lands on the
  // Quick Report directly. View Analysis from /my routes here.
  const searchParams = useSearchParams();
  const { items: collectionItems } = useCollection();
  useEffect(() => {
    const id = searchParams.get("artworkId");
    if (!id) return;
    const item = collectionItems.find(i => i.id === id);
    if (!item) return;
    setShowIntro(false);
    setAnalysis(item.analysis as unknown as Analysis);
    setImagePreview(item.imagePreview ?? null);
    setScreen("result");
  }, [searchParams, collectionItems]);

  // All hooks above run unconditionally
  if (showIntro) return <IntroSplash onComplete={handleIntroComplete} />;

  /* ── Helpers ────────────────────────────────────────────────── */

  const loadPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setPendingFile(file);
    setError(null);
    setScreen("preview");
  };

  // Fire-and-forget report persistence. Failure just means the share
  // button has no deep-link target — the rest of the screen still works.
  const persistReport = async (
    a: Analysis,
    imageUrl: string | null,
    sourceType: SourceType,
  ) => {
    // Derive a safe estimated range status from the analysis. We never
    // emit $0K-$0K — if low/high aren't available, the field stays
    // "insufficient_data" and the viewer renders the safe label.
    const auctionPrices = (a.auctions ?? [])
      .map(au => parseAuctionPrice(au.result))
      .filter((n): n is number => n !== null);
    const hasRange = auctionPrices.length >= 1;
    const sortedPrices = [...auctionPrices].sort((x, y) => x - y);

    const id = await saveReport({
      artist:          a.artist  ?? "Unknown",
      title:           a.title   ?? "Untitled",
      year:            a.year,
      imageUrl:        imageUrl ?? undefined,
      representativeImageUrl: imageUrl ?? undefined,
      analysisSummary: a.description ?? "",
      // Insight: prefer marketNote (judgment-style) → description fallback,
      // capped at 220 chars so the OG description stays clean.
      artenaInsight: ((a.marketNote ?? a.description ?? "") || "").slice(0, 220) || undefined,
      analysisFull:    a as unknown as Record<string, unknown>,
      sourceType,
      // Snapshot — these are best-effort derived signals; absence is fine.
      estimatedRangeStatus: hasRange ? "available" : "insufficient_data",
      estimatedLow:         hasRange ? sortedPrices[0] : undefined,
      estimatedHigh:        hasRange ? sortedPrices[sortedPrices.length - 1] : undefined,
      currency:             hasRange ? "USD" : undefined,
      comparableMatches:    auctionPrices.length,
      // Default trust for now: image/text inputs are AI-inferred.
      trustLevel:           "ai_inferred",
      isShareable:          true,
    });
    if (id) setReportId(id);
  };

  /** Parse "$28,000" / "$1.2M" / "$25K–$35K" into a USD number, or null. */
  const parseAuctionPrice = (s: string): number | null => {
    if (!s) return null;
    const cleaned = s.replace(/,/g, "");
    const m = cleaned.match(/([\d.]+)\s*([KkMm]?)/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!isFinite(n) || n <= 0) return null;
    if (/[Mm]/.test(m[2])) return n * 1_000_000;
    if (/[Kk]/.test(m[2])) return n * 1_000;
    return n;
  };

  const compressIfNeeded = (file: File): Promise<Blob> => {
    const LIMIT = 3 * 1024 * 1024;
    if (file.size <= LIMIT) return Promise.resolve(file);
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1920;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height / width) * MAX); width = MAX; }
          else                 { width  = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  // SmartScanner frame capture → skip preview, go straight to analysis
  const analyzeWithFile = async (file: File, dataUrl: string) => {
    setShowScanner(false);
    setImagePreview(dataUrl);
    setPendingFile(file);
    setError(null);
    setScreen("loading");
    try {
      const blob = await compressIfNeeded(file);
      const fd   = new FormData();
      fd.append("image", blob, "scan.jpg");
      const res  = await fetch("/api/analyze", { method: "POST", body: fd });
      const ct   = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        if (res.status === 413) throw new Error("이미지가 너무 큽니다.");
        throw new Error(`서버 오류 (${res.status})`);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "분석 실패");
      setAnalysis(json.data);
      setScreen("result");
      persistReport(json.data, dataUrl, "image");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("upload");
    }
  };

  const analyzeImage = async () => {
    if (!pendingFile) return;
    setError(null);
    setScreen("loading");
    try {
      const blob = await compressIfNeeded(pendingFile);
      const fd   = new FormData();
      fd.append("image", blob, "image.jpg");
      const res  = await fetch("/api/analyze", { method: "POST", body: fd });
      const ct   = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        if (res.status === 413) throw new Error("이미지가 너무 큽니다.");
        throw new Error(`서버 오류 (${res.status})`);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "분석 실패");
      setAnalysis(json.data);
      setScreen("result");
      persistReport(json.data, imagePreview, "image");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("preview");
    }
  };

  // Called from HomeScreen text search — accepts query directly
  const analyzeTextQuery = async (query: string) => {
    if (!query.trim()) return;
    setImagePreview(null);
    setError(null);
    setScreen("loading");
    try {
      const res  = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "분석 실패");
      setAnalysis(json.data);
      setScreen("result");
      // Async wiki image fetch — result shown immediately, image loads in bg
      const d        = json.data;
      const cat      = d.category ?? "painting";
      const isArch   = cat === "architecture" || cat === "artifact" || cat === "cultural_site";
      const imgQuery = isArch ? (d.title ?? "") : [d.title, d.artist].filter(Boolean).join(" ");
      if (imgQuery.trim()) {
        fetch(`/api/wiki-image?q=${encodeURIComponent(imgQuery)}`)
          .then(r => r.json())
          .then(img => {
            const url = img.url ?? null;
            if (url) setImagePreview(url);
            // Persist after wiki image lands so the saved report has it.
            persistReport(json.data, url, "text");
          })
          .catch(() => {
            persistReport(json.data, null, "text");
          });
      } else {
        persistReport(json.data, null, "text");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("upload");
    }
  };

  const reset = () => {
    setScreen("upload"); setAnalysis(null);
    setImagePreview(null); setPendingFile(null); setError(null);
    setReportType(null); setReportData(null);
    setReportId(null);
  };

  const generateIntelligenceReport = async () => {
    if (!analysis) return;
    setReportType("intelligence");
    setReportData(null);
    setReportLoading(true);
    try {
      const res  = await fetch("/api/market-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysis }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setReportData(json.data as MarketIntelligenceData);
    } catch {
      setReportType(null);
    } finally {
      setReportLoading(false);
    }
  };

  /* ── Conditional screens ────────────────────────────────────── */

  // SmartScanner — full-screen overlay
  if (showScanner) {
    return (
      <SmartScanner
        onClose={() => setShowScanner(false)}
        onCapture={analyzeWithFile}
        onUpload={() => setShowScanner(false)}
        onManualSearch={() => setShowScanner(false)}
      />
    );
  }

  // Preview — confirm uploaded image before analysis
  if (screen === "preview") {
    return (
      <div style={{ fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 14, color: "#1a1a18", padding: "52px 22px 100px", maxWidth: 430, margin: "0 auto", background: "#F8F7F4", minHeight: "100vh", boxSizing: "border-box" as const }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, textDecoration: "none", color: "inherit" }}>
          <span style={{ fontSize: 17, letterSpacing: ".05em", fontStyle: "italic", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>ARTENA</span>
          <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#CCC" }}>Cultural Intelligence AI</span>
        </a>
        {imagePreview && (
          <div style={{ width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 18, background: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
            <img src={imagePreview} alt="업로드된 작품" style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }} />
          </div>
        )}
        <button onClick={analyzeImage} style={{ width: "100%", padding: "15px 0", background: "#111", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: ".05em", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#8A6A3F" }}>◆</span>
          ARTENA AI 분석
        </button>
        <button onClick={() => { setScreen("upload"); setImagePreview(null); setPendingFile(null); setError(null); }} style={{ width: "100%", padding: "12px 0", background: "transparent", color: "#AAA", border: "0.5px solid #E0E0E0", borderRadius: 12, cursor: "pointer", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 13 }}>
          다시 선택하기
        </button>
        {error && <div style={{ background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}><p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{error}</p></div>}
      </div>
    );
  }

  // Result — QuickReport (full-screen, no nav)
  if (screen === "result") {
    return (
      <QuickReport
        analysis={analysis ?? {}}
        imagePreview={imagePreview}
        sourceType="image"
        onReset={reset}
        onFullReport={generateIntelligenceReport}
        reportLoading={reportLoading && reportType === "intelligence"}
        reportData={reportType === "intelligence" && !reportLoading ? (reportData as MarketIntelligenceData | null) : null}
        reportId={reportId ?? undefined}
      />
    );
  }

  // Loading — when we have an image, keep it as backdrop so the
  // scanner→loading→QuickReport flow feels visually continuous.
  if (screen === "loading") {
    return (
      <div style={{
        maxWidth: 430, margin: "0 auto", minHeight: "100vh",
        background: imagePreview ? "#000" : "#F8F7F4",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 22px",
        position: "relative" as const, overflow: "hidden",
      }}>
        {imagePreview && (
          <img
            src={imagePreview}
            alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover",
              filter: "blur(14px) brightness(0.55)",
              transform: "scale(1.06)",
            }}
          />
        )}
        <div style={{
          position: "relative" as const, zIndex: 1,
          background: imagePreview ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: imagePreview ? "blur(14px)" : undefined,
          WebkitBackdropFilter: imagePreview ? "blur(14px)" : undefined,
          borderRadius: 20,
          padding: imagePreview ? "28px 36px" : 0,
          boxShadow: imagePreview ? "0 8px 40px rgba(0,0,0,0.18)" : undefined,
        }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Home (upload) — new Cultural Intelligence UI
  return (
    <>
      <HomeScreen
        onOpenScanner={() => setShowScanner(true)}
        onFileSelected={loadPreview}
        onTextSubmit={analyzeTextQuery}
        error={error}
      />
      <BottomNav currentTab="scan" />
    </>
  );
}

/* ── Shell content (reads tab from context) ───────────────────── */

function AppShellContent() {
  const { activeTab } = useTabNav();
  const [visited, setVisited] = useState<Set<AppTab>>(new Set(["scan"]));

  useEffect(() => {
    setVisited(prev => new Set([...prev, activeTab]));
  }, [activeTab]);

  return (
    <>
      {/* Scan tab — always mounted, shown/hidden */}
      <div style={{ display: activeTab === "scan" ? "block" : "none" }}>
        <ScanScreen />
      </div>

      {/* Other tabs — lazy-mounted on first visit, then kept alive */}
      {visited.has("collection") && (
        <div style={{ display: activeTab === "collection" ? "block" : "none" }}>
          <CollectionPageContent />
        </div>
      )}
      {visited.has("taste") && (
        <div style={{ display: activeTab === "taste" ? "block" : "none" }}>
          <TastePageContent />
        </div>
      )}
      {visited.has("recommendations") && (
        <div style={{ display: activeTab === "recommendations" ? "block" : "none" }}>
          <RecommendationsPageContent />
        </div>
      )}
      {visited.has("gallery") && (
        <div style={{ display: activeTab === "gallery" ? "block" : "none" }}>
          <GalleryPageContent />
        </div>
      )}
      {visited.has("my") && (
        <div style={{ display: activeTab === "my" ? "block" : "none" }}>
          <MyPageContent />
        </div>
      )}
    </>
  );
}

/* ── App shell entry point ────────────────────────────────────── */
/* Providers live at app/layout.tsx now so every route can access them. */

export default function AppShell() {
  // Suspense boundary required by Next 15 because AppShellContent
  // uses useSearchParams() (for the ?artworkId deep-link).
  return (
    <Suspense fallback={null}>
      <AppShellContent />
    </Suspense>
  );
}
