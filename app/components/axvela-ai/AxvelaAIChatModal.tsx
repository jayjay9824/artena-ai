"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send } from "lucide-react";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans',   system-ui, sans-serif";

interface ChatMsg {
  id:      string;
  role:    "user" | "assistant";
  content: string;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet chat modal opened by the floating AXVELA AI
 * launcher. Posts to /api/axvela-chat (context-free general
 * art-domain assistant). Streams plain text chunks back and
 * appends to the active assistant message in place.
 *
 * Empty-state shows three suggested chips (artist / value /
 * similar). Tapping a chip auto-sends.
 */
export function AxvelaAIChatModal({ open, onClose }: Props) {
  const { t, lang } = useLanguage();

  const [messages,    setMessages]    = useState<ChatMsg[]>([]);
  const [streaming,   setStreaming]   = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input,       setInput]       = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  /* Lock body scroll while open; restore on close. */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  /* Reset on close so reopen feels fresh. */
  useEffect(() => {
    if (open) return;
    const id = setTimeout(() => {
      setMessages([]);
      setStreaming("");
      setIsStreaming(false);
      setInput("");
    }, 320);
    return () => clearTimeout(id);
  }, [open]);

  /* Auto-scroll to latest. */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming]);

  /* Textarea auto-resize. */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }, [input]);

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
        {
          id:      `a-${Date.now()}`,
          role:    "assistant",
          content: acc || t("axvela.modal.error"),
        },
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

  const chipKeys = ["axvela.chip.artist", "axvela.chip.value", "axvela.chip.similar"];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
            style={{
              position:   "fixed",
              inset:      0,
              background: "rgba(0,0,0,0.55)",
              zIndex:     390,
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{    y: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            style={{
              position:     "fixed",
              left:         "50%",
              bottom:       0,
              transform:    "translateX(-50%)",
              width:        "100%",
              maxWidth:     430,
              height:       "82dvh",
              background:   "linear-gradient(180deg, #0E0E1A 0%, #0A0A14 100%)",
              borderTopLeftRadius:  22,
              borderTopRightRadius: 22,
              border:       "1px solid rgba(139, 92, 246, 0.22)",
              borderBottom: "none",
              boxShadow:    "0 -16px 56px rgba(0,0,0,0.55)",
              zIndex:       400,
              fontFamily:   FONT,
              display:      "flex",
              flexDirection: "column",
              overflow:     "hidden",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
            </div>

            {/* Header */}
            <div style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        "10px 18px 14px",
              borderBottom:   "0.5px solid rgba(139, 92, 246, 0.18)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Sparkles size={14} strokeWidth={1.8} color="#A78BFA" />
                <span style={{
                  fontSize:      14,
                  fontWeight:    600,
                  color:         "#FFFFFF",
                  letterSpacing: "0.10em",
                  fontFamily:    FONT_HEAD,
                }}>
                  {t("axvela.modal.title")}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label={t("axvela.modal.close")}
                style={{
                  background:     "rgba(255,255,255,0.06)",
                  border:         "none",
                  width:          32,
                  height:         32,
                  borderRadius:   999,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  cursor:         "pointer",
                }}
              >
                <X size={14} color="#FFFFFF" />
              </button>
            </div>

            {/* Messages area */}
            <div style={{
              flex:           1,
              overflowY:      "auto",
              padding:        "20px 20px 8px",
            }}>
              {messages.length === 0 && !isStreaming && (
                <div style={{ marginTop: 18 }}>
                  <p style={{
                    fontSize:      18,
                    fontWeight:    600,
                    color:         "#FFFFFF",
                    margin:        "0 0 8px",
                    fontFamily:    FONT_HEAD,
                    letterSpacing: "-0.005em",
                  }}>
                    {t("axvela.modal.empty_title")}
                  </p>
                  <p style={{
                    fontSize:    13,
                    color:       "rgba(255,255,255,0.62)",
                    margin:      "0 0 22px",
                    lineHeight:  1.6,
                  }}>
                    {t("axvela.modal.empty_body")}
                  </p>

                  {/* Chips */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {chipKeys.map((key) => (
                      <button
                        key={key}
                        onClick={() => send(t(key))}
                        style={{
                          display:        "flex",
                          alignItems:     "center",
                          gap:            10,
                          padding:        "12px 16px",
                          background:     "rgba(139, 92, 246, 0.08)",
                          border:         "0.5px solid rgba(139, 92, 246, 0.32)",
                          borderRadius:   12,
                          color:          "#FFFFFF",
                          fontSize:       13,
                          textAlign:      "left" as const,
                          cursor:         "pointer",
                          fontFamily:     FONT,
                          letterSpacing:  "0.005em",
                          transition:     "background .14s, border-color .14s",
                        }}
                      >
                        <Sparkles size={11} strokeWidth={1.6} color="#A78BFA" />
                        <span>{t(key)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(m => (
                m.role === "user" ? (
                  <div key={m.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                    <div style={{
                      maxWidth:     "82%",
                      padding:      "10px 14px",
                      background:   "rgba(139, 92, 246, 0.22)",
                      border:       "0.5px solid rgba(167, 139, 250, 0.40)",
                      borderRadius: "16px 16px 4px 16px",
                      color:        "#FFFFFF",
                      fontSize:     13,
                      lineHeight:   1.6,
                    }}>
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} style={{ marginBottom: 22 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Sparkles size={11} strokeWidth={1.8} color="#A78BFA" style={{ marginTop: 5, flexShrink: 0 }} />
                      <div style={{
                        flex:       1,
                        fontSize:   13,
                        color:      "rgba(255,255,255,0.92)",
                        lineHeight: 1.75,
                        whiteSpace: "pre-wrap" as const,
                      }}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                )
              ))}

              {isStreaming && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Sparkles size={11} strokeWidth={1.8} color="#A78BFA" style={{ marginTop: 5, flexShrink: 0 }} />
                    <div style={{
                      flex:       1,
                      fontSize:   13,
                      color:      "rgba(255,255,255,0.92)",
                      lineHeight: 1.75,
                      whiteSpace: "pre-wrap" as const,
                    }}>
                      {streaming || <DotsAnim />}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div style={{
              padding:        "10px 14px calc(20px + env(safe-area-inset-bottom, 0px))",
              borderTop:      "0.5px solid rgba(139, 92, 246, 0.18)",
              background:     "rgba(10,10,20,0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
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
                  placeholder={t("axvela.modal.placeholder")}
                  rows={1}
                  disabled={isStreaming}
                  style={{
                    flex:           1,
                    border:         "0.5px solid rgba(255,255,255,0.14)",
                    borderRadius:   18,
                    padding:        "11px 14px",
                    fontSize:       13,
                    color:          "#FFFFFF",
                    background:     "rgba(255,255,255,0.06)",
                    resize:         "none",
                    outline:        "none",
                    lineHeight:     1.5,
                    fontFamily:     FONT,
                    maxHeight:      100,
                  }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || isStreaming}
                  aria-label="Send"
                  style={{
                    width:          40,
                    height:         40,
                    flexShrink:     0,
                    background:     input.trim() && !isStreaming
                      ? "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)"
                      : "rgba(255,255,255,0.06)",
                    border:         "none",
                    borderRadius:   "50%",
                    cursor:         input.trim() && !isStreaming ? "pointer" : "default",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    transition:     "background .15s",
                    boxShadow:      input.trim() && !isStreaming
                      ? "0 0 16px rgba(139, 92, 246, 0.45)"
                      : "none",
                  }}
                >
                  <Send size={14} color={input.trim() && !isStreaming ? "#FFFFFF" : "rgba(255,255,255,0.32)"} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DotsAnim() {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", height: 18 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width:        5,
            height:       5,
            borderRadius: "50%",
            background:   "#A78BFA",
            display:      "inline-block",
            animation:    `axvela-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes axvela-dot {
          0%, 80%, 100% { transform: scale(0.65); opacity: 0.35; }
          40%           { transform: scale(1);    opacity: 1;    }
        }
      `}</style>
    </span>
  );
}
