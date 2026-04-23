"use client";
import React, { useState, useRef, useEffect } from "react";
import { MarketIntelligenceData } from "./components/MarketIntelligenceReport";
import { QuickReport } from "./components/QuickReport";
import { TabProvider, useTabNav, AppTab } from "../context/TabContext";
import { BottomNav } from "../components/BottomNav";
import { CollectionPageContent } from "../collection/page";
import { TastePageContent } from "../taste/page";
import { RecommendationsPageContent } from "../recommendations/page";

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

/* ── Scan screen (upload → loading → QuickReport) ─────────────── */

function ScanScreen() {
  const [screen, setScreen] = useState("upload");
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [activeInput, setActiveInput] = useState<"image" | "camera" | "text">("image");
  const [reportType, setReportType] = useState<"intelligence" | null>(null);
  const [reportData, setReportData] = useState<MarketIntelligenceData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const analyzeImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
    setScreen("loading");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res  = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "분석 실패");
      setAnalysis(json.data);
      setScreen("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("upload");
    }
  };

  const analyzeText = async () => {
    if (!textQuery.trim()) return;
    setImagePreview(null);
    setError(null);
    setScreen("loading");
    try {
      const res  = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: textQuery }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "분석 실패");
      setAnalysis(json.data);
      setScreen("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("upload");
    }
  };

  const reset = () => {
    setScreen("upload"); setAnalysis(null);
    setImagePreview(null); setError(null); setTextQuery("");
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

  // QuickReport result — full screen, no bottom nav
  if (screen === "result") {
    return (
      <QuickReport
        analysis={analysis ?? {}}
        imagePreview={imagePreview}
        sourceType={activeInput === "camera" ? "camera" : activeInput === "text" ? "text" : "image"}
        onReset={reset}
        onFullReport={generateIntelligenceReport}
        reportLoading={reportLoading && reportType === "intelligence"}
        reportData={reportType === "intelligence" && !reportLoading ? (reportData as MarketIntelligenceData | null) : null}
      />
    );
  }

  // Upload / Loading
  const tabBtn = (id: "image" | "camera" | "text", icon: string, label: string) => (
    <button
      key={id}
      onClick={() => setActiveInput(id)}
      style={{
        flex: 1, padding: "10px 0", border: "none", background: "transparent",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        borderBottom: activeInput === id ? "2px solid #1a1a18" : "2px solid transparent",
        color: activeInput === id ? "#1a1a18" : "#bbb",
        transition: "all .15s",
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11, letterSpacing: ".04em" }}>{label}</span>
    </button>
  );

  return (
    <div style={{
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 14, color: "#1a1a18",
      padding: "20px 22px 100px", maxWidth: 640, margin: "0 auto", background: "#F8F7F4",
      minHeight: "100vh", boxSizing: "border-box", overflowX: "hidden",
    }}>
      {/* Header — ARTENA branding only */}
      <div style={{ marginBottom: 22, paddingBottom: 12, borderBottom: "0.5px solid #e8e3db" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
          <span style={{ fontSize: 17, letterSpacing: ".05em", fontStyle: "italic", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>ARTENA</span>
          <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "#ccc" }}>Cultural Intelligence AI</span>
        </div>
        <p style={{ fontSize: 12, color: "#bbb", margin: 0 }}>작품을 올리면 감성 분석 + 시장 데이터를 함께 보여드립니다</p>
      </div>

      {screen === "loading" ? <LoadingSpinner /> : (
        <>
          {/* Input type tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid #e8e3db", marginBottom: 20 }}>
            {tabBtn("image", "🖼️", "이미지 업로드")}
            {tabBtn("camera", "📷", "카메라")}
            {tabBtn("text", "🔍", "텍스트 검색")}
          </div>

          {activeInput === "image" && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) analyzeImage(f); }}
                onDragOver={(e) => e.preventDefault()}
                style={{ border: "2px dashed #e0dbd4", borderRadius: 10, padding: "44px 24px", textAlign: "center", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", minHeight: 200 }}
              >
                <div style={{ fontSize: 40, marginBottom: 14 }}>🖼️</div>
                <p style={{ fontSize: 14, color: "#777", marginBottom: 4 }}>작품 이미지를 업로드하세요</p>
                <p style={{ fontSize: 11, color: "#ccc", marginBottom: 18 }}>JPG, PNG, WEBP · 최대 20MB</p>
                <span style={{ fontSize: 11, color: "#888", background: "#f0ece8", padding: "7px 18px", borderRadius: 20, border: "0.5px solid #e0dbd4" }}>클릭하거나 드래그하세요</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) analyzeImage(e.target.files[0]); }} />
            </>
          )}

          {activeInput === "camera" && (
            <>
              <div
                onClick={() => cameraInputRef.current?.click()}
                style={{ border: "2px dashed #e0dbd4", borderRadius: 10, padding: "44px 24px", textAlign: "center", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", minHeight: 200 }}
              >
                <div style={{ fontSize: 40, marginBottom: 14 }}>📷</div>
                <p style={{ fontSize: 14, color: "#777", marginBottom: 4 }}>카메라로 작품을 촬영하세요</p>
                <p style={{ fontSize: 11, color: "#ccc", marginBottom: 18 }}>갤러리, 아트페어, 경매장에서 바로 촬영</p>
                <span style={{ fontSize: 11, color: "#888", background: "#f0ece8", padding: "7px 18px", borderRadius: 20, border: "0.5px solid #e0dbd4" }}>카메라 열기</span>
              </div>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) analyzeImage(e.target.files[0]); }} />
            </>
          )}

          {activeInput === "text" && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>작품명, 작가명, 또는 작품 설명을 입력하세요</p>
              <textarea
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyzeText(); } }}
                placeholder={"예: 모네의 수련 연작\n예: 파란 배경에 점들로 가득한 추상화\n예: 김환기 귀로"}
                rows={5}
                style={{ width: "100%", border: "0.5px solid #e0dbd4", borderRadius: 10, padding: "14px 16px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 13, color: "#1a1a18", background: "#fff", resize: "none", outline: "none", lineHeight: 1.7, marginBottom: 12 }}
              />
              <button
                onClick={analyzeText}
                disabled={!textQuery.trim()}
                style={{ width: "100%", padding: "13px 0", background: textQuery.trim() ? "#1a1a18" : "#e0dbd4", color: textQuery.trim() ? "#fff" : "#bbb", border: "none", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 13, letterSpacing: ".06em", cursor: textQuery.trim() ? "pointer" : "default", borderRadius: 8, transition: "all .2s" }}
              >
                분석하기
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 8, padding: "12px 14px", marginTop: 8 }}>
              <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 4 }}>⚠️ 오류 발생</p>
              <p style={{ fontSize: 11, color: "#991B1B" }}>{error}</p>
            </div>
          )}
        </>
      )}

      {/* Bottom nav — only on upload screen (not loading, not result) */}
      {screen === "upload" && <BottomNav currentTab="scan" />}
    </div>
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
    </>
  );
}

/* ── App shell entry point ────────────────────────────────────── */

export default function AppShell() {
  return (
    <TabProvider>
      <AppShellContent />
    </TabProvider>
  );
}
