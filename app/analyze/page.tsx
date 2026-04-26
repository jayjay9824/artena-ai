"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { MarketIntelligenceData } from "./components/MarketIntelligenceReport";
import { QuickReport } from "./components/QuickReport";
import { IntroSplash } from "./components/IntroSplash";
import { SmartScanner } from "./components/SmartScanner";
import { HomeScreen } from "./components/home/HomeScreen";
import { TabProvider, useTabNav, AppTab } from "../context/TabContext";
import { BottomNav } from "../components/BottomNav";
import { CollectionPageContent } from "../collection/page";
import { TastePageContent } from "../taste/page";
import { RecommendationsPageContent } from "../recommendations/page";
import { GalleryPageContent } from "../gallery/page";
import { MyPageContent } from "../my/page";
import { MyActivityProvider } from "../context/MyActivityContext";

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
      <div style={{ width: 40, height: 40, border: "3px solid #f0ece8", borderTop: "3px solid #1a1a18", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
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

  const handleIntroComplete = useCallback(() => setShowIntro(false), []);

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
          .then(img => { if (img.url) setImagePreview(img.url); })
          .catch(() => {});
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
      <div style={{ fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 14, color: "#1a1a18", padding: "52px 22px 100px", maxWidth: 430, margin: "0 auto", background: "#F8F8FA", minHeight: "100vh", boxSizing: "border-box" as const }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
          <span style={{ fontSize: 17, letterSpacing: ".05em", fontStyle: "italic", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>ARTENA</span>
          <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#CCC" }}>Cultural Intelligence AI</span>
        </div>
        {imagePreview && (
          <div style={{ width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 18, background: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
            <img src={imagePreview} alt="업로드된 작품" style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }} />
          </div>
        )}
        <button onClick={analyzeImage} style={{ width: "100%", padding: "15px 0", background: "#111", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: ".05em", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#7C6FF7" }}>◆</span>
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
      />
    );
  }

  // Loading
  if (screen === "loading") {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#F8F8FA", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}>
        <LoadingSpinner />
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

export default function AppShell() {
  return (
    <MyActivityProvider>
      <TabProvider>
        <AppShellContent />
      </TabProvider>
    </MyActivityProvider>
  );
}
