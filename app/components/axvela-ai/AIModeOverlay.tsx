"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, History, Sliders, Mic, Send, Sparkles } from "lucide-react";
import { useLanguage } from "../../i18n/useLanguage";

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
  0%, 100% { transform: translate3d(0, 0, 0);     opacity: 0.18; }
  50%      { transform: translate3d(8px, -10px, 0); opacity: 0.10; }
}
@keyframes axvelaTypingDot {
  0%, 80%, 100% { transform: scale(0.65); opacity: 0.35; }
  40%           { transform: scale(1);    opacity: 1;    }
}

.axvela-ai-overlay-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 50% 35%, rgba(168, 85, 247, 0.13) 0%, rgba(168, 85, 247, 0) 55%),
    radial-gradient(circle at 80% 80%, rgba(99,  102, 241, 0.08) 0%, rgba(99,  102, 241, 0) 60%),
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
  background: rgba(167, 139, 250, 0.45);
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.4);
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

  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const closeTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeFromPopRef   = useRef(false);
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
    }, 360);
    return () => clearTimeout(id);
  }, [open]);

  /* Tear down any pending close timer on unmount. */
  useEffect(() => () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  /* Auto-scroll to latest. */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming]);

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

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
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
        { id: `a-${Date.now()}`, role: "assistant", content: acc || t("axvela.modal.error") },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: `a-err-${Date.now()}`, role: "assistant", content: t("axvela.modal.error") },
      ]);
    } finally {
      setIsStreaming(false);
      setStreaming("");
    }
  }, [messages, isStreaming, lang, t]);

  const greetingMain = t("ai_overlay.greeting_main");
  const showGreeting = messages.length === 0 && !isStreaming;

  /* Animation values — opening uses a 500ms ease-out spring feel,
     closing uses a 400ms ease-in (per Phase 4 spec). Reduced
     motion collapses both to ~150ms so the overlay barely
     transitions at all. */
  const enterDur = reducedMotion ? 0.15 : 0.5;
  const exitDur  = reducedMotion ? 0.15 : 0.4;

  return (
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
              stroke="rgba(168, 85, 247, 0.12)"
              strokeWidth="1"
              fill="none"
            />
            <path
              className="axvela-ai-wave"
              style={{ animationDuration: "22s", animationDelay: "-4s" }}
              d="M0 200 Q 300 240, 600 200 T 1200 200"
              stroke="rgba(99, 102, 241, 0.09)"
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
                    paddingBottom: 12,
                  }}
                >
                  {messages.map(m =>
                    m.role === "user" ? (
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
                    )
                  )}

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
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:             8,
                padding:        "8px 8px 8px 16px",
                background:     "rgba(8, 8, 14, 0.70)",
                backdropFilter:        "blur(24px) saturate(115%)",
                WebkitBackdropFilter:  "blur(24px) saturate(115%)",
                border:         "1px solid rgba(168, 85, 247, 0.40)",
                borderRadius:   9999,
                boxShadow:      "0 12px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
              }}
            >
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
                    ? "0 0 18px rgba(168, 85, 247, 0.50), 0 4px 14px rgba(0, 0, 0, 0.45)"
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
  );
}
