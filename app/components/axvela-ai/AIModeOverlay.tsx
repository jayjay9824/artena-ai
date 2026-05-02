"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, History, Sliders, Mic, Send, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { useLanguage } from "../../i18n/useLanguage";
import { ScanTriggerButton } from "../scan-entry/trigger/ScanTriggerButton";
import { ScanBottomSheet } from "../scan-entry/trigger/ScanBottomSheet";
import { AnalysisAnimation } from "../scan-entry/scanner/AnalysisAnimation";
import { ScannedArtworkCard } from "../scan-entry/result-insight/ScannedArtworkCard";
import { QuickInsightChips } from "../scan-entry/result-insight/QuickInsightChips";
import { SuggestedActionGroup, type SuggestedAction } from "../scan-entry/result-insight/SuggestedActionGroup";
import {
  isPlaceholderArtist,
  isPlaceholderTitle,
  type ScanResult,
  type ScanSheetAction,
  type ScanSource,
  type QuickInsight,
} from "../scan-entry/shared/scanTypes";
import { analyzeArtworkImage } from "../../services/axvelaAnalyzeClient";

/**
 * Step 6 — derive suggested follow-up prompts from a QuickInsight.
 * Verified high-confidence path unlocks market/draft prompts;
 * everything else gets the safer "explain / similar / scan label"
 * trio so we never imply identity or price for low-confidence data.
 */
function getSuggestedActionsForInsight(
  insight: QuickInsight,
  lang:    "ko" | "en",
): SuggestedAction[] {
  const ko          = lang === "ko";
  const isHighConf  = (insight.confidence ?? 0) >= 75;
  const realArtist  = !isPlaceholderArtist(insight.artist);
  const realTitle   = !isPlaceholderTitle(insight.title);
  const verifiedSet = insight.isVerified === true && isHighConf && realArtist && realTitle;

  if (verifiedSet) {
    return ko
      ? [
          { id: "draft",       label: "AI 도록 초안 생성"    },
          { id: "market",      label: "최근 거래 이력 확인" },
          { id: "other_works", label: "이 작가의 다른 작품" },
        ]
      : [
          { id: "draft",       label: "Draft AI catalog text" },
          { id: "market",      label: "Check market history"  },
          { id: "other_works", label: "Other works by artist" },
        ];
  }

  return ko
    ? [
        { id: "explain", label: "이 작품에 대해 더 알려주세요" },
        { id: "similar", label: "비슷한 스타일의 작품 찾기"   },
        { id: "label",   label: "라벨 함께 촬영하기"          },
      ]
    : [
        { id: "explain", label: "Explain this artwork" },
        { id: "similar", label: "Find similar styles"  },
        { id: "label",   label: "Scan the label"       },
      ];
}

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans',   system-ui, sans-serif";

const STYLE_ID = "axvela-ai-overlay-styles";

/**
 * AXVELA AI Mode Overlay (Phase 3).
 *
 * Replaces the legacy AxvelaAIChatModal as the surface that opens
 * after the activation transition. Quiet, dark, premium — the
 * "AI mode is on" surface, never a router push.
 *
 * Layout:
 *   - position: fixed, inset 0, 100dvh, z-index 100
 *   - Background: #0a0a0f base + a single very-faint violet
 *     radial gradient (10–15% peak) for atmosphere
 *   - Top bar: back / title / history + settings (circular glass)
 *   - Center: greeting in empty state, message thread once a
 *     conversation has started
 *   - Bottom: rounded-full input pill (mic, textarea, send) + the
 *     "AI can make mistakes" disclaimer line
 *   - safe-area-inset-top / -bottom respected so content never
 *     slides under the iOS home bar or notch
 *
 * Background decoration:
 *   - 2 SVG wave lines, opacity ≤ 0.12
 *   - 4 small particles drifting slowly, opacity ≤ 0.20
 *   - All keyframe-driven, all suppressed under
 *     prefers-reduced-motion
 *
 * Streams responses from /api/axvela-chat (same context-free
 * endpoint the legacy modal used). The greeting fades once the
 * first user message lands; the message thread takes its place
 * above the input pill.
 */
const KEYFRAMES = `
@keyframes axvelaWaveDrift {
  0%, 100% { transform: translate3d(-2%, 0, 0); }
  50%      { transform: translate3d( 2%, -1%, 0); }
}
@keyframes axvelaParticleDrift {
  0%, 100% { transform: translate3d(0, 0, 0);     opacity: 0.13; }
  50%      { transform: translate3d(8px, -10px, 0); opacity: 0.07; }
}
@keyframes axvelaTypingDot {
  0%, 80%, 100% { transform: scale(0.65); opacity: 0.35; }
  40%           { transform: scale(1);    opacity: 1;    }
}

.axvela-ai-overlay-bg {
  position: absolute; inset: 0;
  /* Phase 5 — radials trimmed ~25% so the dark space reads as
     a quiet room with violet *air*, not a violet wash. */
  background:
    radial-gradient(circle at 50% 35%, rgba(168, 85, 247, 0.10) 0%, rgba(168, 85, 247, 0) 55%),
    radial-gradient(circle at 80% 80%, rgba(99,  102, 241, 0.06) 0%, rgba(99,  102, 241, 0) 60%),
    #0a0a0f;
  pointer-events: none;
}
.axvela-ai-wave {
  animation: axvelaWaveDrift 16s ease-in-out infinite;
  will-change: transform;
}
.axvela-ai-particle {
  position: absolute;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: rgba(167, 139, 250, 0.32);
  box-shadow: 0 0 6px rgba(167, 139, 250, 0.28);
  animation: axvelaParticleDrift 7s ease-in-out infinite;
  will-change: transform, opacity;
  pointer-events: none;
}
.axvela-ai-glass-btn {
  width: 36px; height: 36px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 0.5px solid rgba(255, 255, 255, 0.10);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.78);
  transition: background 140ms ease, border-color 140ms ease;
}
.axvela-ai-glass-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(168, 85, 247, 0.30);
}
.axvela-ai-glass-btn:focus-visible {
  outline: 2px solid rgba(168, 85, 247, 0.6);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .axvela-ai-wave,
  .axvela-ai-particle { animation: none !important; }
}
`;

interface ChatMsg {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  ts:      number;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function AIModeOverlay({ open, onClose }: Props) {
  const { t, lang } = useLanguage();
  const reducedMotion = useReducedMotion();

  const [messages,    setMessages]    = useState<ChatMsg[]>([]);
  const [streaming,   setStreaming]   = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input,       setInput]       = useState("");

  /* Phase 4 — back transition state. The overlay handles its own
     fade-out locally (400ms), then calls onClose so the parent's
     home recovery starts after the overlay has finished hiding. */
  const [isClosing,   setIsClosing]   = useState(false);

  /* visualViewport sync — tracks keyboard so the overlay shrinks
     to the visible area on iOS / Android Chrome and the input
     pill never gets covered. Falls back to 100dvh otherwise. */
  const [vhPx,        setVhPx]        = useState<number | null>(null);

  /* Scan-first UX state (Steps 4–6). */
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);

  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const closeTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeFromPopRef   = useRef(false);
  const cameraInputRef    = useRef<HTMLInputElement>(null);
  const uploadInputRef    = useRef<HTMLInputElement>(null);
  const analyzeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef        = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  /* Inject decoration + button styles once. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.textContent = KEYFRAMES;
    document.head.appendChild(tag);
  }, []);

  /* Body scroll lock while open. */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  /* Reset chat + closing flag on close so reopen returns to the
     greeting and isn't stuck mid-fade. */
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      return;
    }
    const id = setTimeout(() => {
      setMessages([]);
      setStreaming("");
      setIsStreaming(false);
      setInput("");
      setIsClosing(false);
      setSheetOpen(false);
      setScanResults([]);
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }
    }, 360);
    return () => clearTimeout(id);
  }, [open]);

  /* Tear down any pending close timer on unmount. */
  useEffect(() => () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
  }, []);

  /* Auto-scroll to latest. Scan-card transitions from analyzing→
     ready add height, so we re-scroll on scanResults length AND
     on each result's status change so the failure message at the
     bottom of the new card never sits below the fold. */
  const scanSignature = scanResults.map(r => `${r.id}:${r.status}`).join("|");
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming, scanSignature]);

  /* Textarea auto-resize. */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  /* Phase 4 — single close path used by back button, ESC, and
     popstate. Plays the overlay fade locally, then asks the
     parent to flip isAIMode 400ms later so the home recovery
     starts after the overlay has finished hiding. */
  const triggerClose = useCallback(() => {
    setIsClosing(prev => {
      if (prev) return prev;  // already closing
      const fadeMs = reducedMotion ? 150 : 400;
      closeTimerRef.current = setTimeout(() => {
        // Pop the history entry we pushed on open — but only if the
        // close wasn't already triggered by a popstate (browser back).
        if (!closeFromPopRef.current && typeof window !== "undefined") {
          try { window.history.back(); } catch { /* ignore */ }
        }
        closeFromPopRef.current = false;
        onCloseRef.current();
        closeTimerRef.current = null;
      }, fadeMs);
      return true;
    });
  }, [reducedMotion]);

  /* Phase 4 — browser back support. Push a synthetic history
     entry on open, listen for popstate. Browser back closes the
     overlay instead of navigating away. */
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    window.history.pushState({ axvelaAIOverlay: true }, "");

    const onPop = () => {
      closeFromPopRef.current = true;
      triggerClose();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, triggerClose]);

  /* Phase 4 — ESC closes the overlay on desktop. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, triggerClose]);

  /* Phase 4 — focus the input on open, restore focus to the
     trigger element (the AXVELA AI button) on close. */
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = (typeof document !== "undefined"
      ? document.activeElement
      : null) as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 200);

    return () => {
      clearTimeout(focusTimer);
      try { previouslyFocused?.focus?.(); } catch { /* ignore */ }
    };
  }, [open]);

  /* Phase 4 — visualViewport-aware height. When the soft keyboard
     opens, visualViewport.height shrinks; we set the overlay to
     that height so the input pill rides up with the keyboard
     instead of getting clipped under it. */
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => setVhPx(vv.height);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setVhPx(null);
    };
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: trimmed, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsStreaming(true);
    setStreaming("");

    try {
      const res = await fetch("/api/axvela-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          language: lang,
        }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }

      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: acc || t("axvela.modal.error"), ts: Date.now() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: `a-err-${Date.now()}`, role: "assistant", content: t("axvela.modal.error"), ts: Date.now() },
      ]);
    } finally {
      setIsStreaming(false);
      setStreaming("");
    }
  }, [messages, isStreaming, lang, t]);

  /* ── Scan-first handlers (Steps 4–6) ─────────────────────────── */

  const startAnalysis = useCallback((dataUrl: string, source: ScanSource) => {
    const id       = nanoid();
    const now      = Date.now();
    const language = (lang === "en" ? "en" : "ko") as "ko" | "en";

    setScanResults(prev => [
      ...prev,
      {
        id,
        imageDataUrl: dataUrl,
        source,
        status:       "analyzing",
        createdAt:    new Date(now).toISOString(),
        ts:           now,
      },
    ]);

    /* Step 7 — real analyze client. The client itself owns the 10s
       AbortController timeout and never throws; failure paths
       resolve to a graceful insight + message so the UI never sees
       a raw technical error. Stale-id map is a no-op if the
       overlay was closed before resolution. */
    analyzeArtworkImage({
      imageDataUrl:   dataUrl,
      outputLanguage: language,
    }).then(result => {
      setScanResults(prev => prev.map(r =>
        r.id === id
          ? {
              ...r,
              status:  "ready",
              insight: result.insight,
              message: result.message,
            }
          : r,
      ));
    });
  }, [lang]);

  const onFileChosen = useCallback((file: File | undefined, source: ScanSource) => {
    if (!file) return;
    const accepted = ["image/jpeg", "image/png", "image/webp"];
    /* Silent reject for unsupported types — never show technical
       error copy. The user can simply retry from the sheet. */
    if (file.type && !accepted.includes(file.type)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      startAnalysis(dataUrl, source);
    };
    reader.readAsDataURL(file);
  }, [startAnalysis]);

  const openSheet = useCallback(() => {
    /* Drop keyboard so the sheet animates over a settled layout. */
    textareaRef.current?.blur();
    setSheetOpen(true);
  }, []);

  const onSheetSelect = useCallback((action: ScanSheetAction) => {
    setSheetOpen(false);
    if (action === "scan") {
      /* Defer slightly so the sheet's exit animation starts before
         the file picker takes over the screen. */
      setTimeout(() => cameraInputRef.current?.click(), 60);
      return;
    }
    if (action === "upload") {
      setTimeout(() => uploadInputRef.current?.click(), 60);
      return;
    }
    /* "recent" — disabled / mock for now per Step 4 spec. */
  }, []);

  const onSuggestedAction = useCallback((action: SuggestedAction) => {
    send(action.label);
  }, [send]);

  const greetingMain = t("ai_overlay.greeting_main");
  const showGreeting = messages.length === 0 && scanResults.length === 0 && !isStreaming;

  /* Unified, time-ordered feed of chat messages + scan results so
     scans render in the position they happened, not pinned at top
     or bottom. */
  type FeedItem =
    | { kind: "msg";  ts: number; msg:  ChatMsg }
    | { kind: "scan"; ts: number; scan: ScanResult };
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [
      ...messages.map(m     => ({ kind: "msg",  ts: m.ts, msg:  m } as FeedItem)),
      ...scanResults.map(s  => ({ kind: "scan", ts: s.ts, scan: s } as FeedItem)),
    ];
    items.sort((a, b) => a.ts - b.ts);
    return items;
  }, [messages, scanResults]);

  /* Latest READY scan drives the SuggestedActionGroup above the
     input pill. While analyzing or fallback, no suggestions show. */
  const latestReady = useMemo(
    () => [...scanResults].reverse().find(r => r.status === "ready" && r.insight),
    [scanResults],
  );
  const latestInsight     = latestReady?.insight;
  const suggestedActions  = latestInsight
    ? getSuggestedActionsForInsight(latestInsight, lang as "ko" | "en")
    : null;
  const showLowConfHint   = !!latestInsight && (latestInsight.confidence ?? 0) < 75;
  const lowConfHint       = lang === "ko"
    ? "라벨을 함께 촬영하면 정확도가 높아집니다."
    : "Scan the label to improve accuracy.";

  /* Animation values — opening uses a 500ms ease-out spring feel,
     closing uses a 400ms ease-in (per Phase 4 spec). Reduced
     motion collapses both to ~150ms so the overlay barely
     transitions at all. */
  const enterDur = reducedMotion ? 0.15 : 0.5;
  const exitDur  = reducedMotion ? 0.15 : 0.4;

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          key="ai-overlay"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={
            isClosing
              ? { opacity: 0, scale: 1.02 }
              : { opacity: 1, scale: 1    }
          }
          transition={
            isClosing
              ? { duration: exitDur,  ease: "easeIn" }
              : { duration: enterDur, ease: [0.16, 1, 0.3, 1] }
          }
          // No visible exit animation — by the time AnimatePresence
          // unmounts (after parent flips open=false), isClosing has
          // already faded the overlay to its exit values.
          exit={{ opacity: 0, scale: 1.02, transition: { duration: 0 } }}
          aria-modal="true"
          role="dialog"
          aria-label={t("ai_overlay.aria_label")}
          style={{
            position:   "fixed",
            inset:      0,
            zIndex:     100,
            // visualViewport.height when available gives a precise
            // keyboard-aware height; 100dvh otherwise survives iOS
            // Safari URL bar collapse + Android Chrome resize.
            height:     vhPx !== null ? `${vhPx}px` : "100dvh",
            background: "#0a0a0f",
            color:      "#FFFFFF",
            fontFamily: FONT,
            display:    "flex",
            flexDirection: "column",
            overflow:   "hidden",
          }}
        >
          {/* Atmospheric background — radial purple wash + waves +
              particles. All extremely subtle. */}
          <div className="axvela-ai-overlay-bg" />

          <svg
            aria-hidden
            viewBox="0 0 1200 800"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset:    0,
              width:    "100%",
              height:   "100%",
              pointerEvents: "none",
            }}
          >
            <path
              className="axvela-ai-wave"
              d="M0 600 Q 300 540, 600 600 T 1200 600"
              stroke="rgba(168, 85, 247, 0.09)"
              strokeWidth="1"
              fill="none"
            />
            <path
              className="axvela-ai-wave"
              style={{ animationDuration: "22s", animationDelay: "-4s" }}
              d="M0 200 Q 300 240, 600 200 T 1200 200"
              stroke="rgba(99, 102, 241, 0.07)"
              strokeWidth="1"
              fill="none"
            />
          </svg>

          {[
            { top: "22%", left: "16%", delay: "0s",   dur: "7s" },
            { top: "38%", left: "78%", delay: "1.2s", dur: "8s" },
            { top: "62%", left: "12%", delay: "2.4s", dur: "9s" },
            { top: "75%", left: "84%", delay: "3.6s", dur: "7.5s" },
          ].map((p, i) => (
            <span
              key={i}
              aria-hidden
              className="axvela-ai-particle"
              style={{
                top:               p.top,
                left:              p.left,
                animationDelay:    p.delay,
                animationDuration: p.dur,
              }}
            />
          ))}

          {/* ── Top bar ──────────────────────────────────────────── */}
          <div
            style={{
              position:        "relative" as const,
              zIndex:          2,
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "space-between",
              padding:         "calc(env(safe-area-inset-top, 0px) + 14px) 16px 14px",
            }}
          >
            <button
              onClick={triggerClose}
              aria-label={t("ai_overlay.back")}
              className="axvela-ai-glass-btn"
            >
              <ArrowLeft size={16} strokeWidth={1.8} />
            </button>

            <span
              style={{
                fontFamily:    FONT_HEAD,
                fontSize:      13,
                fontWeight:    600,
                letterSpacing: "0.18em",
                color:         "rgba(255,255,255,0.86)",
              }}
            >
              {t("ai_overlay.title")}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button aria-label={t("ai_overlay.history")}  className="axvela-ai-glass-btn">
                <History size={15} strokeWidth={1.8} />
              </button>
              <button aria-label={t("ai_overlay.settings")} className="axvela-ai-glass-btn">
                <Sliders size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {/* ── Center — greeting OR message thread ─────────────── */}
          <div
            style={{
              flex:        1,
              position:    "relative" as const,
              zIndex:      2,
              overflowY:   "auto",
              padding:     "0 22px",
              display:     "flex",
              flexDirection: "column",
            }}
          >
            <AnimatePresence mode="popLayout">
              {showGreeting ? (
                <motion.div
                  key="greeting"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{    opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    flex:           1,
                    display:        "flex",
                    flexDirection:  "column",
                    alignItems:     "center",
                    justifyContent: "center",
                    textAlign:      "center" as const,
                    padding:        "8px 4px 24px",
                  }}
                >
                  <h1
                    style={{
                      fontFamily:    FONT_HEAD,
                      fontSize:      28,
                      fontWeight:    600,
                      letterSpacing: "-0.005em",
                      lineHeight:    1.45,
                      color:         "#FFFFFF",
                      margin:        "0 0 22px",
                      whiteSpace:    "pre-line" as const,
                    }}
                  >
                    {greetingMain}
                  </h1>
                  <p
                    style={{
                      fontSize:    14,
                      lineHeight:  1.7,
                      color:       "rgba(186, 186, 196, 0.86)",
                      margin:      0,
                      maxWidth:    320,
                      whiteSpace:  "pre-line" as const,
                    }}
                  >
                    {t("ai_overlay.greeting_pre")}
                    <span style={{ color: "#C4B5FD", fontWeight: 600 }}>
                      {t("ai_overlay.greeting_highlight")}
                    </span>
                    {t("ai_overlay.greeting_post")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="thread"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    paddingTop: 20,
                    /* Step 9 — extra bottom buffer so the last scan
                       card's footer text (failure message / low-conf
                       hint) is never visually clipped by the input
                       section sitting beneath the thread. */
                    paddingBottom: 32,
                  }}
                >
                  {feed.map(item => {
                    if (item.kind === "msg") {
                      const m = item.msg;
                      return m.role === "user" ? (
                        <div key={m.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                          <div style={{
                            maxWidth:     "82%",
                            padding:      "10px 14px",
                            background:   "rgba(168, 85, 247, 0.18)",
                            border:       "0.5px solid rgba(167, 139, 250, 0.32)",
                            borderRadius: "16px 16px 4px 16px",
                            color:        "#FFFFFF",
                            fontSize:     14,
                            lineHeight:   1.6,
                          }}>
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} style={{ marginBottom: 22 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                            <Sparkles size={11} strokeWidth={1.8} color="#C4B5FD" style={{ marginTop: 6, flexShrink: 0 }} />
                            <div style={{
                              flex:       1,
                              fontSize:   14,
                              color:      "rgba(232, 232, 240, 0.95)",
                              lineHeight: 1.75,
                              whiteSpace: "pre-wrap" as const,
                            }}>
                              {m.content}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    /* Scan-result inline card. While analyzing we show
                       the captured image with the AnalysisAnimation
                       sweep. Once ready, the white compact card +
                       chips replace the animation in place. */
                    const r = item.scan;
                    if (r.status === "analyzing") {
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                          style={{ marginBottom: 22 }}
                        >
                          <AnalysisAnimation imageDataUrl={r.imageDataUrl} />
                        </motion.div>
                      );
                    }

                    /* status === "ready" — render compact white
                       attachment card matched to ChatGPT-like image
                       attachments. Mock insight always shows the
                       Draft chip + low-confidence hint. */
                    const insight        = r.insight;
                    const lowConf        = !!insight && (insight.confidence ?? 0) < 75;
                    const draftFooterCopy = lang === "ko"
                      ? "라벨을 함께 촬영하면 정확도가 높아집니다."
                      : "Scan the label to improve accuracy.";

                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                        style={{ marginBottom: 22, display: "flex", justifyContent: "flex-start" }}
                      >
                        <div style={{ width: "100%", maxWidth: 380, minWidth: 0 }}>
                          <ScannedArtworkCard artwork={r} />
                          {insight && (
                            <div style={{
                              marginTop:    10,
                              display:      "flex",
                              flexDirection: "column",
                              gap:          8,
                              minWidth:     0,
                            }}>
                              <QuickInsightChips insight={insight} variant="dark" />
                              {lowConf && (
                                <p style={{
                                  margin:        0,
                                  fontSize:      11.5,
                                  lineHeight:    1.6,
                                  color:         "rgba(255, 255, 255, 0.62)",
                                  letterSpacing: "0.01em",
                                  wordBreak:     "keep-all",
                                  overflowWrap:  "anywhere",
                                }}>
                                  {draftFooterCopy}
                                </p>
                              )}
                              {/* Step 7 — graceful failure copy from the
                                  analyze client. Step 9 fix: italic dropped
                                  (it cramped Korean glyphs at small sizes
                                  and clipped the descenders), font bumped
                                  to 13px, and word-break tuned for KO so
                                  the message never overflows on narrow
                                  viewports. */}
                              {r.message && (
                                <p style={{
                                  margin:        "2px 0 2px",
                                  fontSize:      13,
                                  lineHeight:    1.65,
                                  color:         "rgba(255, 255, 255, 0.82)",
                                  letterSpacing: "0.005em",
                                  wordBreak:     "keep-all",
                                  overflowWrap:  "anywhere",
                                  whiteSpace:    "normal",
                                }}>
                                  {r.message}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {isStreaming && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                        <Sparkles size={11} strokeWidth={1.8} color="#C4B5FD" style={{ marginTop: 6, flexShrink: 0 }} />
                        <div style={{
                          flex:       1,
                          fontSize:   14,
                          color:      "rgba(232, 232, 240, 0.95)",
                          lineHeight: 1.75,
                          whiteSpace: "pre-wrap" as const,
                        }}>
                          {streaming || (
                            <span style={{ display: "inline-flex", gap: 5, alignItems: "center", height: 18 }}>
                              {[0, 1, 2].map(i => (
                                <span
                                  key={i}
                                  style={{
                                    width: 5, height: 5, borderRadius: "50%",
                                    background: "#C4B5FD",
                                    display: "inline-block",
                                    animation: `axvelaTypingDot 1.2s ease-in-out ${i * 0.18}s infinite`,
                                  }}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Input pill + disclaimer ─────────────────────────── */}
          <div
            style={{
              position: "relative" as const,
              zIndex:   2,
              padding:  "10px 16px calc(env(safe-area-inset-bottom, 0px) + 18px)",
            }}
          >
            {/* Suggested follow-ups derived from the latest READY
                scan. Hidden while no scan is on-screen so the input
                area stays uncluttered (Step 6 rule). */}
            {suggestedActions && (
              <motion.div
                key={`suggested-${latestReady?.id ?? "none"}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                style={{ marginBottom: 10 }}
              >
                <SuggestedActionGroup
                  insight={latestInsight}
                  actions={suggestedActions}
                  onSelect={onSuggestedAction}
                />
                {showLowConfHint && (
                  <p style={{
                    margin:        "8px 2px 0",
                    fontSize:      11.5,
                    lineHeight:    1.6,
                    color:         "rgba(255, 255, 255, 0.62)",
                    letterSpacing: "0.01em",
                    wordBreak:     "keep-all",
                    overflowWrap:  "anywhere",
                  }}>
                    {lowConfHint}
                  </p>
                )}
              </motion.div>
            )}

            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:             8,
                padding:        "8px 8px 8px 10px",
                background:     "rgba(8, 8, 14, 0.72)",
                backdropFilter:        "blur(24px) saturate(115%)",
                WebkitBackdropFilter:  "blur(24px) saturate(115%)",
                /* Phase 5 — pill border softened so it reads as a
                   pane of glass, not a violet outline. */
                border:         "1px solid rgba(168, 85, 247, 0.28)",
                borderRadius:   9999,
                boxShadow:      "0 10px 32px rgba(0, 0, 0, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.07)",
              }}
            >
              {/* Step 4 — "+" Scan-first entry. Left of mic so the
                  send affordance stays anchored to the right. */}
              <ScanTriggerButton
                tone="dark"
                onClick={openSheet}
                ariaLabel={lang === "ko" ? "작품 스캔 또는 업로드" : "Scan or upload artwork"}
                disabled={isStreaming}
              />

              <button
                aria-label={t("ai_overlay.mic")}
                style={{
                  width:           32,
                  height:          32,
                  borderRadius:    9999,
                  background:      "transparent",
                  border:          "none",
                  cursor:          "pointer",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  color:           "rgba(255,255,255,0.55)",
                  flexShrink:      0,
                }}
              >
                <Mic size={16} strokeWidth={1.8} />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={t("ai_overlay.input_placeholder")}
                rows={1}
                disabled={isStreaming}
                style={{
                  flex:           1,
                  border:         "none",
                  background:     "transparent",
                  outline:        "none",
                  resize:         "none",
                  // 16px on iOS prevents form-zoom on focus.
                  fontSize:       16,
                  color:          "#FFFFFF",
                  lineHeight:     1.4,
                  fontFamily:     FONT,
                  maxHeight:      96,
                  padding:        "6px 4px",
                }}
              />

              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isStreaming}
                aria-label={t("ai_overlay.send")}
                style={{
                  width:           38,
                  height:          38,
                  flexShrink:      0,
                  borderRadius:    9999,
                  border:          "none",
                  cursor:          input.trim() && !isStreaming ? "pointer" : "default",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  background:      input.trim() && !isStreaming
                    ? "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)"
                    : "rgba(255, 255, 255, 0.06)",
                  boxShadow:       input.trim() && !isStreaming
                    ? "0 0 12px rgba(168, 85, 247, 0.35), 0 4px 14px rgba(0, 0, 0, 0.45)"
                    : "none",
                  transition:      "background 160ms ease, box-shadow 160ms ease",
                }}
              >
                <Send
                  size={15}
                  strokeWidth={1.8}
                  color={input.trim() && !isStreaming ? "#FFFFFF" : "rgba(255,255,255,0.32)"}
                />
              </button>
            </div>

            <p
              style={{
                margin:        "12px 0 0",
                fontSize:      10.5,
                color:         "rgba(255, 255, 255, 0.32)",
                letterSpacing: "0.02em",
                textAlign:     "center" as const,
                lineHeight:    1.5,
              }}
            >
              {t("ai_overlay.disclaimer")}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Step 4 — Scan / Upload / Recent bottom sheet. Sibling of the
        overlay so its z-index can stack cleanly above the dialog
        without being clipped by the overlay's overflow:hidden. */}
    <ScanBottomSheet
      open={open && sheetOpen}
      onClose={() => setSheetOpen(false)}
      onSelect={onSheetSelect}
    />

    {/* Step 5 — hidden file inputs the sheet rows trigger. The
        capture="environment" hint biases mobile to launch the rear
        camera; the upload input has no capture attr so it biases
        to the photo library. */}
    <input
      ref={cameraInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture="environment"
      style={{ display: "none" }}
      onChange={(e) => {
        onFileChosen(e.target.files?.[0], "camera");
        e.target.value = "";
      }}
    />
    <input
      ref={uploadInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      style={{ display: "none" }}
      onChange={(e) => {
        onFileChosen(e.target.files?.[0], "upload");
        e.target.value = "";
      }}
    />
    </>
  );
}
