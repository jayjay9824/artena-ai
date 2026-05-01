"use client";
import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MarketIntelligenceData } from "./components/MarketIntelligenceReport";
import { QuickReport } from "./components/QuickReport";
import { IntroSplash } from "./components/IntroSplash";
import { SmartScanner } from "./components/SmartScanner";
import { SmartScannerScreen } from "../components/scanner/SmartScannerScreen";
import type { ScanSuccessPayload } from "../types/scanner";
import { HomeScreen } from "./components/home/HomeScreen";
import { MinimalHomeScreen } from "../components/home/MinimalHomeScreen";
import { StagedAnalysisScreen } from "./components/StagedAnalysisScreen";
import { useStagedAnalysis } from "./hooks/useStagedAnalysis";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import { useTabNav, AppTab } from "../context/TabContext";
import { BottomNav } from "../components/BottomNav";
import { CollectionPageContent } from "../collection/page";
import { TastePageContent } from "../taste/page";
import { RecommendationsPageContent } from "../recommendations/page";
import { GalleryPageContent } from "../gallery/page";
import { MyPageContent } from "../my/page";
import { saveReport, generateReport } from "../services/reportService";
import { matchArtwork } from "../services/matchingService";
import { findArtworkById } from "../services/canonicalCatalogue";
import { useCollection } from "../collection/hooks/useCollection";
import { NoMatch } from "../components/match/NoMatch";
import { CandidateSelection, CandidateRow } from "../components/match/CandidateSelection";
import type { SourceType, MatchedArtwork } from "../lib/types";
import { useLanguage } from "../i18n/useLanguage";
import { safeT, type TranslationFn } from "../lib/i18n/safeT";

/**
 * Detect the dominant script of a string for the language-mismatch
 * guard.
 *
 *   "ko"      → contains Hangul (U+AC00–U+D7A3)
 *   "en"      → contains Latin alphabet but no Hangul
 *   "unknown" → only digits / punctuation / mixed scripts we
 *               can't classify confidently
 *
 * The Hangul check wins over Latin: a sentence like "AXVELA가
 * 작품을 분석합니다" is Korean even though it contains the brand
 * name in Latin. We only flag mismatches when the message is
 * unambiguously the wrong language.
 */
function detectMessageLang(s: string | null | undefined): "ko" | "en" | "unknown" {
  if (!s) return "unknown";
  if (/[가-힣]/.test(s)) return "ko";
  if (/[A-Za-z]/.test(s))         return "en";
  return "unknown";
}

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
        AXVELA AI
      </a>
      <div style={{ width: 40, height: 40, border: "3px solid #EBE6DB", borderTop: "3px solid #8A6A3F", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>작가와 작품을 AXVELA AI가 분석중입니다</p>
        <p style={{ fontSize: 11, color: "#bbb" }}>시장 데이터, 작품 이력, 경매 기록을 분석하고 있습니다...</p>
      </div>
    </div>
  );
}

/* ── Scan screen ──────────────────────────────────────────────── */

function ScanScreen() {
  const { goTo } = useTabNav();
  const { t, lang } = useLanguage();
  // Intro → Home cross-fade gates (Step 4):
  //   introMounted — controls whether IntroSplash is in the tree
  //   introDone    — controls Home layer opacity. Flips from
  //                  IntroSplash.onReady (one rAF before Intro
  //                  begins its own fade) so Intro and Home share
  //                  the same fade window — Home is fully painted
  //                  with its ocean background by the time Intro
  //                  disappears.
  const [introMounted, setIntroMounted] = useState(true);
  const [introDone,    setIntroDone]    = useState(false);
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
  const [candidates,    setCandidates]    = useState<MatchedArtwork[]>([]);
  // STEP 2 — label-scan mode. When the user taps "Scan Label" from
  // the uncertain-recognition sheet we re-open the scanner with the
  // wide horizontal viewfinder. The latest scanned image becomes the
  // input for re-analysis (multimodal merge with the original artwork
  // is wired here as a same-pipeline re-run; richer image-pair
  // merging lands in a follow-up step).
  const [labelScanMode, setLabelScanMode] = useState(false);

  // STEP 1 — staged analysis (Quick View + Progressive Loading) for
  // image uploads. Runs the quick + full endpoints concurrently and
  // exposes per-stage status to the loading UI. Text/canonical paths
  // skip this — they're already instant.
  const staged             = useStagedAnalysis();
  const persistedRef       = useRef(false);
  const imagePreviewRef    = useRef<string | null>(null);
  imagePreviewRef.current  = imagePreview;

  // STEP 3 — offline queue. analyzeImage / analyzeTextQuery check
  // navigator.onLine before firing the API call; if offline, the scan
  // is persisted to IndexedDB and the global OfflineBanner surfaces
  // the "Saved locally" pill. Auto-sync on reconnect lives in
  // OfflineBanner so it works even if the user has navigated to a
  // non-Scan tab.
  const offline = useOfflineQueue();

  // onReady fires the instant IntroSplash is about to fade out —
  // flips Home opacity to 1 so the two layers cross-fade. onComplete
  // fires after IntroSplash has self-unmounted; we mirror that into
  // introMounted so any conditional rendering keyed on it stays in
  // sync.
  const handleIntroReady    = useCallback(() => setIntroDone(true), []);
  const handleIntroComplete = useCallback(() => setIntroMounted(false), []);

  // Step 5 — toggle `intro-active` on <html> while the home layer is
  // still hidden behind the splash. globals.css uses this to force
  // SCAN button opacity 0 + box-shadow none, which keeps the orb's
  // heavy halo from compositing as a black ellipse on KakaoTalk
  // before the ocean background paints.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (introDone) {
      root.classList.remove("intro-active");
    } else {
      root.classList.add("intro-active");
    }
    return () => { root.classList.remove("intro-active"); };
  }, [introDone]);

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
    // Deep-link skip — drop the intro entirely and reveal the
    // result directly. Both gates flip together so Home is visible
    // and the splash is unmounted in a single render.
    setIntroMounted(false);
    setIntroDone(true);
    setAnalysis(item.analysis as unknown as Analysis);
    setImagePreview(item.imagePreview ?? null);
    setScreen("result");
  }, [searchParams, collectionItems]);

  // STEP 1 — When the staged hook completes (full analysis in hand
  // and all four stages "ready"), promote into the result screen and
  // persist exactly once. The persistedRef guard survives the staged
  // reducer's async revealStage cascade. persistReport is defined
  // later in the function body — captured via closure (resolves when
  // the effect fires post-render).
  useEffect(() => {
    if (!staged.fullAnalysis) return;
    if (staged.stages.comparables !== "ready") return;
    if (persistedRef.current) return;
    persistedRef.current = true;
    setAnalysis(staged.fullAnalysis as Analysis);
    setScreen("result");
    persistReport(staged.fullAnalysis as Analysis, imagePreviewRef.current, "image");
    // persistReport / setAnalysis intentionally omitted — fires once per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged.fullAnalysis, staged.stages.comparables]);

  useEffect(() => {
    if (!staged.error) return;
    // Detect network failure (offline / fetch failed) and route to the
    // queue path; otherwise show the message and reset to preview.
    const looksLikeNetwork =
      /Failed to fetch|NetworkError|fetch failed|Load failed/i.test(staged.error) ||
      (typeof navigator !== "undefined" && !navigator.onLine);
    if (looksLikeNetwork && pendingFile) {
      void offline.enqueue({ imageBlob: pendingFile });
      setError(null);
      setScreen("upload");
      setPendingFile(null);
      setImagePreview(null);
      return;
    }
    setError(staged.error);
    setScreen(pendingFile ? "preview" : "upload");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged.error]);

  // Hooks above all run unconditionally. Step 4 — IntroSplash is
  // no longer rendered as an early return; instead it overlays the
  // Home layer below so the two cross-fade.

  /* ── Helpers ────────────────────────────────────────────────── */

  const loadPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setPendingFile(file);
    setError(null);
    setScreen("preview");
  };

  /**
   * Project a canonical Artwork record into the loose Analysis shape
   * the QuickReport screen expects. Only fields we actually have
   * verified data for are populated — unknown fields stay undefined
   * (Trust over Fancy: no fabrication for missing values).
   */
  const canonicalToAnalysis = (aw: import("../lib/types").Artwork): Analysis => {
    return {
      title:       aw.title,
      artist:      aw.artistName ?? "",
      year:        aw.year,
      style:       aw.period,
      description: aw.artenaInsight ?? aw.shortSummary ?? aw.description,
      marketNote:  aw.artenaInsight,
      keywords:    aw.aliases,
      // Emotions / auctions / collections / works / critics / exhibitions
      // intentionally left undefined — those are derivable signals the
      // canonical record doesn't carry directly.
    };
  };

  // Fire-and-forget report persistence. Failure just means the share
  // button has no deep-link target — the rest of the screen still works.
  // When `canonical` is supplied, the snapshot carries the verified
  // marketPosition / marketConfidence / dataDepth / comparableMatches /
  // marketStability + artworkId + axid from the canonical Artwork
  // (spec STEP 4). Otherwise the report saves with derived values
  // and trustLevel: "ai_inferred".
  const persistReport = async (
    a: Analysis,
    imageUrl: string | null,
    sourceType: SourceType,
    canonical?: import("../lib/types").Artwork,
  ) => {
    // Derive a safe estimated range status from the analysis. We never
    // emit $0K-$0K — if low/high aren't available, the field stays
    // "insufficient_data" and the viewer renders the safe label.
    const auctionPrices = (a.auctions ?? [])
      .map(au => parseAuctionPrice(au.result))
      .filter((n): n is number => n !== null);
    const hasRange = auctionPrices.length >= 1;
    const sortedPrices = [...auctionPrices].sort((x, y) => x - y);

    // STEP 2 — route through the cache-aware /api/reports/generate
    // endpoint. Cache hit by artworkId returns the existing reportId
    // immediately; cache miss persists synchronously because we already
    // have analysisFull in hand (no background Claude call needed).
    const result = await generateReport({
      // Identity (spec STEP 4 names) — populated when this report
      // snapshots a canonical Artwork.
      artworkId:    canonical?.id,
      axid:         canonical?.axid,
      galleryId:    canonical?.galleryId,

      // Display
      artist:                 canonical?.artistName   ?? a.artist  ?? "Unknown",
      artistNameKo:           canonical?.artistNameKo,
      title:                  canonical?.title        ?? a.title   ?? "Untitled",
      titleKo:                canonical?.titleKo,
      year:                   canonical?.year         ?? a.year,
      medium:                 canonical?.medium,
      dimensions:             canonical?.dimensions,
      imageUrl:               imageUrl ?? undefined,
      representativeImageUrl: canonical?.primaryImageUrl ?? imageUrl ?? undefined,

      analysisSummary: a.description ?? "",
      // Insight: prefer canonical → marketNote → description; cap to keep
      // the OG description clean.
      artenaInsight: (canonical?.artenaInsight ?? a.marketNote ?? a.description ?? "").slice(0, 220) || undefined,
      analysisFull:  a as unknown as Record<string, unknown>,
      sourceType,

      // Market snapshot — canonical signals win when present, else fall
      // back to derived values. Never $0K-$0K: range status defaults to
      // insufficient_data when no price data is verified.
      marketPosition:       canonical?.marketPosition,
      marketConfidence:     canonical?.marketConfidence,
      estimatedRangeStatus: hasRange ? "available" : "insufficient_data",
      estimatedLow:         hasRange ? sortedPrices[0] : undefined,
      estimatedHigh:        hasRange ? sortedPrices[sortedPrices.length - 1] : undefined,
      currency:             hasRange ? "USD" : undefined,
      dataDepth:            canonical?.dataDepth,
      comparableMatches:    canonical?.comparableMatches ?? auctionPrices.length,
      marketStability:      canonical?.marketStability,

      // Trust: canonical → its own trustLevel; else ai_inferred.
      trustLevel:  canonical?.trustLevel ?? "ai_inferred",
      isShareable: true,
    });
    if (result?.reportId) setReportId(result.reportId);
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
  // Routes through the staged hook so QuickView paints in ~2-3s while
  // the full Opus analysis runs in parallel. Offline detection moved
  // into the staged-error effect so a flaky navigator.onLine reading
  // doesn't block legitimate online scans.
  const analyzeWithFile = async (file: File, dataUrl: string) => {
    setShowScanner(false);
    setImagePreview(dataUrl);
    setPendingFile(file);
    setError(null);
    persistedRef.current = false;
    try {
      const blob = await compressIfNeeded(file);
      setScreen("loading");
      staged.runImage(blob);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("upload");
    }
  };

  const analyzeImage = async () => {
    if (!pendingFile) return;
    setError(null);
    persistedRef.current = false;
    try {
      const blob = await compressIfNeeded(pendingFile);
      setScreen("loading");
      staged.runImage(blob);
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
      // Trust-first text path. Routing per matchArtwork outcome:
      //   confident → canonical record, no Claude
      //   ambiguous → user picks from candidates (no fabrication)
      //   no_match  → NoMatch screen, no fabrication
      // Spec STEP 3: "틀린 결과보다 결과 없음이 더 신뢰도 높습니다."
      const outcome = await matchArtwork({ matchedBy: "text", query });
      if (outcome.kind === "confident") {
        const aw = findArtworkById(outcome.match.artworkId);
        if (aw) {
          const canonical = canonicalToAnalysis(aw);
          setAnalysis(canonical);
          if (aw.primaryImageUrl) setImagePreview(aw.primaryImageUrl);
          setScreen("result");
          // Pass the Artwork so the snapshot carries axid + canonical
          // market signals (spec STEP 4 snapshot freeze).
          persistReport(canonical, aw.primaryImageUrl ?? null, "text", aw);
          return;
        }
      }
      if (outcome.kind === "ambiguous") {
        setCandidates(outcome.candidates);
        setScreen("candidates");
        return;
      }
      if (outcome.kind === "no_match") {
        setScreen("no_match");
        return;
      }

      // Unreachable today — kept for forward-compat with new outcomes.
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

  // Camera Intelligence Layer — new SmartScannerScreen (mock cycle +
  // FocusFrame + spatial exit). Legacy SmartScanner import kept for
  // back-compat; not rendered. onScanSuccess routes the captured frame
  // straight into the staged-analysis pipeline (analyzeWithFile).
  if (showScanner) {
    const handleScanSuccess = (payload: ScanSuccessPayload) => {
      if (!payload.imageBlob || !payload.imageURI) {
        setShowScanner(false);
        setLabelScanMode(false);
        return;
      }
      const file = payload.imageBlob instanceof File
        ? payload.imageBlob
        : new File([payload.imageBlob], "scan.jpg", {
            type: payload.imageBlob.type || "image/jpeg",
          });
      // STEP 2 — both first-pass and label-mode scans funnel through
      // the same staged analyze pipeline. Recognition is re-derived
      // from the new analysis; confidence may upgrade if the label
      // image carried more identifying detail.
      setLabelScanMode(false);
      analyzeWithFile(file, payload.imageURI);
    };
    return (
      <SmartScannerScreen
        onClose={() => { setShowScanner(false); setLabelScanMode(false); }}
        onUploadImage={() => { setShowScanner(false); setLabelScanMode(false); }}
        onSearchByText={() => { setShowScanner(false); setLabelScanMode(false); }}
        onScanSuccess={handleScanSuccess}
        labelMode={labelScanMode}
      />
    );
  }
  // Suppress "unused" warning while we keep SmartScanner imported
  // for any future fallback compose.
  void SmartScanner;

  // Preview — confirm uploaded image before analysis
  if (screen === "preview") {
    return (
      <div style={{ fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 14, color: "#1a1a18", padding: "52px 22px 100px", maxWidth: 430, margin: "0 auto", background: "#F8F7F4", minHeight: "100vh", boxSizing: "border-box" as const }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, textDecoration: "none", color: "inherit" }}>
          <span style={{ fontSize: 17, letterSpacing: ".05em", fontStyle: "italic", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>AXVELA</span>
          <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#CCC" }}>Cultural Intelligence AI</span>
        </a>
        {imagePreview && (
          <div style={{ width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 18, background: "#000", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
            <img src={imagePreview} alt="업로드된 작품" style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }} />
          </div>
        )}
        <button onClick={analyzeImage} style={{ width: "100%", padding: "15px 0", background: "#111", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: ".05em", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#8A6A3F" }}>◆</span>
          AXVELA AI 분석
        </button>
        <button onClick={() => { setScreen("upload"); setImagePreview(null); setPendingFile(null); setError(null); }} style={{ width: "100%", padding: "12px 0", background: "transparent", color: "#AAA", border: "0.5px solid #E0E0E0", borderRadius: 12, cursor: "pointer", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 13 }}>
          다시 선택하기
        </button>
        {error && (() => {
          // STEP 8 — language-mismatch guard. If the API returned a
          // rejection in the wrong language for the current UI, swap
          // it for the localized rejection.generic key (via safeT so
          // a missing dict still produces readable English).
          const messageLang = detectMessageLang(error);
          const mismatch =
            (lang === "en" && messageLang === "ko") ||
            (lang === "ko" && messageLang === "en");
          const display = mismatch
            ? safeT(
                t as TranslationFn,
                "rejection.generic",
                "This doesn't appear to be an artwork. Please try a different image.",
              )
            : error;
          return (
            <div style={{ background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
              <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{display}</p>
            </div>
          );
        })()}
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
        // STEP 2 — uncertain recognition routes back into the scanner
        // with the wide horizontal viewfinder. Search-by-text falls
        // back to the home surface for now (search input lives there).
        onScanLabel={() => {
          setLabelScanMode(true);
          setShowScanner(true);
        }}
        onSearchByText={() => {
          setShowScanner(false);
          setLabelScanMode(false);
          reset();
        }}
      />
    );
  }

  // Candidate selection — text query matched 2+ records in the
  // ambiguous confidence band. User picks one or escapes to NoMatch.
  if (screen === "candidates") {
    const rows: CandidateRow[] = candidates
      .map(m => {
        const aw = findArtworkById(m.artworkId);
        if (!aw) return null;
        return {
          match:      m,
          artwork:    aw,
          artistName: aw.artistName ?? "",
        };
      })
      .filter((r): r is CandidateRow => r !== null);

    return (
      <CandidateSelection
        candidates={rows}
        onSelect={artworkId => {
          const aw = findArtworkById(artworkId);
          if (!aw) { setScreen("no_match"); return; }
          const canonical = canonicalToAnalysis(aw);
          setAnalysis(canonical);
          if (aw.primaryImageUrl) setImagePreview(aw.primaryImageUrl);
          setCandidates([]);
          setScreen("result");
          persistReport(canonical, aw.primaryImageUrl ?? null, "text", aw);
        }}
        onNoMatch={() => { setCandidates([]); setScreen("no_match"); }}
      />
    );
  }

  // No Match — trust-first path. The matcher couldn't reach high
  // confidence and we refuse to fabricate a result. Spec STEP 3.
  if (screen === "no_match") {
    return (
      <NoMatch
        onTryAnotherImage={() => { setScreen("upload"); setShowScanner(true); }}
        onSearchByText={() => setScreen("upload")}
        onEnterManually={() => setScreen("upload")}
      />
    );
  }

  // Loading — STEP 1 staged Quick View + Progressive Loading. The
  // QuickView card paints in ~2-3s and never disappears; the four
  // stage rows tick to "ready" as data arrives.
  if (screen === "loading") {
    return (
      <StagedAnalysisScreen
        quickView={staged.quickView}
        stages={staged.stages}
        imagePreview={imagePreview}
      />
    );
  }

  // Home — full replacement: ultra-minimal scan-first surface.
  // Legacy HomeScreen import kept for back-compat with code paths
  // that may compose it elsewhere; not rendered here.
  //
  // Step 4 cross-fade structure:
  //   - Home wrapper is always mounted, with the ocean fallback
  //     (color + image) painted underneath. SCAN orb sits on top
  //     and only becomes visible (opacity 1) once introDone flips,
  //     so the brand shadow never paints onto a blank background.
  //   - IntroSplash overlays at z 9999, fades out + self-unmounts
  //     once both its readiness gates clear. While fading the
  //     splash carries pointer-events: none so it never blocks
  //     clicks on the home below.
  return (
    <>
      <div
        // Step 6 — `app-container` provides stacked min-height
        // fallbacks (100vh → 100dvh → calc(var(--vh) * 100)) so
        // KakaoTalk's WebView lands on the JS-driven --vh value
        // from ViewportHeightSync and the home doesn't jump
        // vertically during the cross-fade.
        className="app-container"
        // Step 7 — while hidden behind the splash the home is
        // marked aria-hidden and pointer-events:none so screen
        // readers don't double-announce and stray taps don't
        // hit the SCAN button at opacity 0.
        aria-hidden={!introDone}
        style={{
          position:           "relative",
          backgroundColor:    "#2c4a6b",
          backgroundImage:    "url('/ocean-background.jpg')",
          backgroundSize:     "cover",
          backgroundPosition: "center",
          backgroundRepeat:   "no-repeat",
          opacity:            introDone ? 1 : 0,
          pointerEvents:      introDone ? "auto" : "none",
          transition:         "opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <MinimalHomeScreen
          onOpenScanner={() => setShowScanner(true)}
          onCollection={() => goTo("collection")}
          onProfile={() => goTo("my")}
          onFileSelected={loadPreview}
        />
      </div>
      {introMounted && (
        <IntroSplash
          onReady={handleIntroReady}
          onComplete={handleIntroComplete}
        />
      )}
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
