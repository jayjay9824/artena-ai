"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { QRAnalysis } from "../QuickReport";
import type { MarketIntelligenceData } from "../MarketIntelligenceReport";
import type { ChatMessage, QuestionType } from "../../../types/assistant";
import { trackEvent, makeArtworkId } from "../../lib/analytics";
import { pickAskChips } from "../../lib/suggestedQuestions";
import { trackEvent as trackArtena } from "../../../services/tracking/trackEvent";
import { useAskHistory } from "../../hooks/useAskHistory";
import { useLanguage } from "../../../i18n/useLanguage";

/* ── Text line renderer ──────────────────────────────────────────────────── */

function Lines({ text }: { text: string }) {
  const parts = text.split("\n");
  return (
    <>
      {parts.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </React.Fragment>
      ))}
    </>
  );
}

/* ── Typing indicator ────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", height: 18 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: "50%", background: "#CCCCCC",
            display: "inline-block",
            animation: `aa-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

/* ── CSS ─────────────────────────────────────────────────────────────────── */

const AA_STYLES = `
  @keyframes aa-dot {
    0%, 80%, 100% { transform: scale(0.65); opacity: 0.35; }
    40%           { transform: scale(1);    opacity: 1;    }
  }
  @keyframes aa-cursor {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
  }
  .aa-chip:hover         { background: #F4EFE5 !important; border-color: #D9C9A6 !important; }
  .aa-close-btn:hover    { background: #F0F0F0 !important; }
  .aa-send-btn:hover     { opacity: 0.84; }
`;

/* ── Props ───────────────────────────────────────────────────────────────── */

export interface ArtAssistantScreenProps {
  analysis: QRAnalysis;
  imagePreview: string | null;
  reportData?: MarketIntelligenceData | null;
  onClose: () => void;
  /**
   * If set, the chat opens with this question already submitted (as if
   * the user had clicked a chip on the QuickReport screen). Tapped
   * once on QuickReport, sent automatically here — never an empty
   * chat with a "what would you like to ask?" dead-end.
   */
  initialQuestion?: { text: string; type?: QuestionType };
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function ArtAssistantScreen({
  analysis,
  imagePreview,
  reportData,
  onClose,
  initialQuestion,
}: ArtAssistantScreenProps) {
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [streamingContent, setStreaming]    = useState("");
  const [isStreaming, setIsStreaming]        = useState(false);
  const [inputText, setInputText]            = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const { t }          = useLanguage();

  // BLOCK B — three contextual chips picked from the artwork's
  // category / position / topical signals. Falls back to the static
  // STEP 6 set when nothing notable is detected.
  const suggestedQuestions = pickAskChips(analysis).map(c => ({
    text: t(c.key),
    type: c.type,
  }));

  /* BLOCK B — every Ask is tied to artwork_id. Used for both the
     legacy analytics surface and the PART 5 ARTENA tracker. */
  const artworkId = useMemo(
    () => makeArtworkId({
      title:  analysis.title,
      artist: analysis.artist,
      year:   analysis.year,
    }),
    [analysis.title, analysis.artist, analysis.year],
  );

  /* BLOCK C — past Q/A for this artwork (frozen at mount). New
     exchanges from this session persist via append() but stay out of
     `past` so the surface doesn't double-render the current thread. */
  const { past, append } = useAskHistory(artworkId);

  /* BLOCK D — HISTORY_VIEW_EXPANDED fires once when past is present
     at mount (the user landed on a surface that contains history). */
  const historyExpandedRef = useRef(false);
  useEffect(() => {
    if (historyExpandedRef.current) return;
    if (past.length === 0) return;
    historyExpandedRef.current = true;
    trackArtena("HISTORY_VIEW_EXPANDED", { artwork_id: artworkId });
  }, [past.length, artworkId]);

  /* BLOCK D — HISTORY_SCROLL_DEPTH fires once when the past header
     enters the viewport (user scrolled into past thinking). */
  const pastHeaderRef = useRef<HTMLDivElement | null>(null);
  const scrollLoggedRef = useRef(false);
  useEffect(() => {
    if (past.length === 0) return;
    if (typeof IntersectionObserver === "undefined") return;
    const node = pastHeaderRef.current;
    if (!node) return;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !scrollLoggedRef.current) {
          scrollLoggedRef.current = true;
          trackArtena("HISTORY_SCROLL_DEPTH", { artwork_id: artworkId });
          obs.disconnect();
          break;
        }
      }
    }, { threshold: 0.4 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [past.length, artworkId]);

  /* BLOCK B — ASK_OPEN fires once per session mount. */
  const askOpenedRef = useRef(false);
  useEffect(() => {
    if (askOpenedRef.current) return;
    askOpenedRef.current = true;
    trackArtena("ASK_OPEN", { artwork_id: artworkId });
  }, [artworkId]);

  /* BLOCK B — ASK_RESPONSE_VIEWED whenever an assistant message is
     newly mounted in the conversation. */
  const lastAssistantSeenRef = useRef<string | null>(null);
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAssistant) return;
    if (lastAssistantSeenRef.current === lastAssistant.id) return;
    lastAssistantSeenRef.current = lastAssistant.id;
    trackArtena("ASK_RESPONSE_VIEWED", { artwork_id: artworkId });
  }, [messages, artworkId]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  // Textarea auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }, [inputText]);

  const sendMessage = useCallback(async (
    content: string,
    type: QuestionType = "interpretation",
    fromSuggested = false,
  ) => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
      questionType: type,
      fromSuggested,
    };

    // Data Flywheel — every question is tracked. trackEvent() auto-detects
    // purchase intent and emits a follow-on intent_signal event when matched.
    trackEvent("ai_question_asked", {
      artworkId,
      text: trimmed,
      questionType: type,
      fromSuggested,
      turnIndex: messages.length / 2,
    });
    if (fromSuggested) {
      trackEvent("ai_suggested_chip_used", { artworkId, text: trimmed, questionType: type });
    }

    /* BLOCK B — ARTENA tracker (PART 5 schema). Carries artwork_id +
       question_text on every Ask edge so intent rolls up by canonical
       work. FOLLOW_UP_ASK detection counts existing user messages —
       if there's already at least one, this is a follow-up. */
    const userMessagesSoFar = messages.filter(m => m.role === "user").length;
    const isFollowUp        = userMessagesSoFar >= 1;
    if (isFollowUp) {
      trackArtena("FOLLOW_UP_ASK", { artwork_id: artworkId, question_text: trimmed });
    } else if (fromSuggested) {
      trackArtena("SUGGESTED_QUESTION_CLICKED", { artwork_id: artworkId, question_text: trimmed });
    } else {
      trackArtena("CUSTOM_QUESTION_SUBMITTED", { artwork_id: artworkId, question_text: trimmed });
    }
    trackArtena("ASK", { artwork_id: artworkId, question_text: trimmed });

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText("");
    setIsStreaming(true);
    setStreaming("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          reportData: reportData ?? null,
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("요청 실패");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreaming(accumulated);
      }

      const finalAssistant: ChatMessage = {
        id:        `a-${Date.now()}`,
        role:      "assistant",
        content:   accumulated || "답변을 생성하지 못했습니다.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, finalAssistant]);

      /* BLOCK C — persist this exchange (user + assistant) to past
         history. Doesn't touch the current `past` state — just
         writes through, so this surface stays uncluttered until
         the user reopens the artwork later. */
      append([userMsg, finalAssistant]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: "assistant",
          content: "죄송합니다. 답변 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreaming("");
    }
  }, [messages, isStreaming, analysis, reportData, artworkId, append]);

  /* ── Auto-send the chip-tapped question on mount ────────────────────── */
  // Guarded by a ref so React strict-mode double-mount doesn't double-send.
  const sentInitialRef = useRef(false);
  useEffect(() => {
    if (sentInitialRef.current) return;
    if (!initialQuestion?.text)  return;
    sentInitialRef.current = true;
    void sendMessage(initialQuestion.text, initialQuestion.type ?? "interpretation", true);
    // sendMessage intentionally omitted from deps — its identity changes
    // every render and we only ever want this to fire once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const categoryLabel = analysis.category === "architecture"
    ? "건축 기준"
    : (analysis.category === "artifact" || analysis.category === "cultural_site")
      ? "유물 기준"
      : "작품 기준";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AA_STYLES }} />

      {/* Full-screen overlay */}
      <div style={{
        position: "fixed",
        top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 640,
        zIndex: 200,
        background: "#FAFAFA",
        display: "flex", flexDirection: "column",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>

        {/* ── Context Header ─────────────────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderBottom: "0.5px solid #EDEDED",
          padding: "52px 18px 15px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

            {/* Back button */}
            <button
              onClick={onClose}
              className="aa-close-btn"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px 8px 10px",
                background: "#F4F4F4",
                border: "none",
                borderRadius: 20,
                cursor: "pointer", flexShrink: 0,
                transition: "background .12s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M9 2L4 7L9 12" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#111", letterSpacing: "-.01em" }}>
                뒤로
              </span>
            </button>

            {/* Artwork thumbnail */}
            <div style={{
              width: 38, height: 38, flexShrink: 0,
              overflow: "hidden", background: "#EDEDEA",
            }}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, color: "#C8C8C8" }}>◆</span>
                </div>
              )}
            </div>

            {/* Artist + Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 600, color: "#111",
                margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {analysis.artist || "Unknown"}
              </p>
              <p style={{
                fontSize: 10, color: "#AAAAAA", margin: "2px 0 0",
                fontStyle: "italic",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {analysis.title || "Untitled"}
                {analysis.year ? ` · ${analysis.year}` : ""}
              </p>
            </div>

            {/* Context badge */}
            <span style={{
              fontSize: 9, color: "#8A6A3F",
              background: "#F4EFE5",
              padding: "4px 10px", borderRadius: 12,
              letterSpacing: ".06em", flexShrink: 0,
              whiteSpace: "nowrap",
            }}>
              ◆ {categoryLabel}
            </span>
          </div>

          {/* ARTENA logo line — clickable, links to home */}
          <a
            href="/"
            style={{
              display: "block",
              fontSize: 8, color: "#8A6A3F", letterSpacing: ".22em",
              textTransform: "uppercase", margin: "10px 0 0 50px",
              textDecoration: "none",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}
          >
            ARTENA AI · Ask
          </a>
        </div>

        {/* ── Messages scroll area ───────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 20px 12px" }}>

          {/* BLOCK B — chips-only empty state. Welcome paragraph
              removed so the surface reads as continuation of thought
              rather than a chat-bot greeting. */}
          {messages.length === 0 && (
            <div style={{ marginBottom: 30 }}>
              {/* Suggested chips — horizontal scroll, minimal pill */}
              <div style={{
                display: "flex",
                flexWrap: "nowrap",
                gap: 8,
                overflowX: "auto",
                scrollbarWidth: "none",
                margin: "0 -20px",
                padding: "2px 20px",
              }}>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q.text}
                    onClick={() => sendMessage(q.text, q.type, true)}
                    className="aa-chip"
                    style={{
                      flexShrink: 0,
                      padding: "8px 14px",
                      background: "#FFFFFF",
                      border: "0.5px solid #E2E2E2",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 12, color: "#333",
                      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                      letterSpacing: "-.01em",
                      lineHeight: 1.4,
                      whiteSpace: "nowrap" as const,
                      transition: "background .12s, border-color .12s",
                    }}
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              /* User bubble */
              <div
                key={msg.id}
                style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}
              >
                <div style={{
                  maxWidth: "78%",
                  padding: "11px 17px",
                  background: "#111111",
                  borderRadius: "20px 20px 4px 20px",
                  color: "#FFFFFF",
                  fontSize: 13, lineHeight: 1.65,
                }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              /* AI response */
              <div key={msg.id} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 8, color: "#8A6A3F", marginTop: 6, flexShrink: 0 }}>◆</span>
                  <div style={{
                    fontSize: 13, color: "#1C1C1C", lineHeight: 1.8,
                    flex: 1,
                  }}>
                    <Lines text={msg.content} />
                  </div>
                </div>
                {/* Subtle separator after AI message */}
                <div style={{ height: 0.5, background: "#F0F0F0", marginTop: 18, marginLeft: 18 }} />
              </div>
            )
          )}

          {/* Streaming message */}
          {isStreaming && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 8, color: "#8A6A3F", marginTop: 6, flexShrink: 0 }}>◆</span>
                <div style={{ fontSize: 13, color: "#1C1C1C", lineHeight: 1.8, flex: 1 }}>
                  {streamingContent ? (
                    <>
                      <Lines text={streamingContent} />
                      <span style={{
                        display: "inline-block",
                        width: 2, height: 14,
                        background: "#8A6A3F",
                        marginLeft: 2,
                        verticalAlign: "text-bottom",
                        animation: "aa-cursor 0.9s ease-in-out infinite",
                      }} />
                    </>
                  ) : (
                    <TypingDots />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BLOCK C — inline history. Past Q/A from prior sessions
              renders dimmed at the bottom of the scroll area. The user
              "scrolls into their own past thinking"; nothing is
              "opened" or "loaded" — it's just there. */}
          {past.length > 0 && (
            <div
              ref={pastHeaderRef}
              style={{
                marginTop:  messages.length > 0 ? 28 : 56,
                paddingTop: 22,
                borderTop:  "0.5px dashed #ECECEC",
              }}
            >
              <p style={{
                fontSize:      9,
                color:         "#9A9A9A",
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                margin:        "0 0 18px",
                fontWeight:    600,
                fontFamily:    "'KakaoSmallSans', system-ui, sans-serif",
              }}>
                {t("ask.previously_explored")}
              </p>
              {past.map(msg => (
                msg.role === "user" ? (
                  <div
                    key={msg.id}
                    style={{
                      display:        "flex",
                      justifyContent: "flex-end",
                      marginBottom:   14,
                    }}
                  >
                    <div style={{
                      maxWidth:    "78%",
                      padding:     "10px 16px",
                      background:  "#F2F2F2",
                      borderRadius:"18px 18px 4px 18px",
                      color:       "#8E8E93",
                      fontSize:    12.5,
                      lineHeight:  1.6,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{
                        fontSize:  8,
                        color:     "#C8B89A",
                        marginTop: 6,
                        flexShrink: 0,
                      }}>◆</span>
                      <div style={{
                        flex:       1,
                        fontSize:   12.5,
                        color:      "#8E8E93",
                        lineHeight: 1.7,
                      }}>
                        <Lines text={msg.content} />
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* BLOCK B — input bar hidden until the user has at least one
            exchange. Empty state surfaces chips only; the textarea is
            secondary and emerges as a follow-up affordance once the
            conversation begins. */}
        {messages.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderTop: "0.5px solid #EDEDED",
          padding: "12px 16px 28px",
          flexShrink: 0,
        }}>
          {/* Context reminder */}
          <p style={{
            fontSize: 9, color: "#CCCCCC", letterSpacing: ".06em",
            margin: "0 0 8px 4px",
          }}>
            ◆ {analysis.artist || "작가"} · {analysis.title || "작품"} 기준으로 답변 중
          </p>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputText);
                }
              }}
              placeholder={t("ask.placeholder")}
              rows={1}
              disabled={isStreaming}
              style={{
                flex: 1,
                border: "0.5px solid #E4E4E4",
                borderRadius: 22,
                padding: "11px 16px",
                fontSize: 13, color: "#111",
                background: isStreaming ? "#F6F6F6" : "#F2F2F2",
                resize: "none", outline: "none",
                lineHeight: 1.5,
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                overflowY: "auto",
                maxHeight: 100,
                transition: "background .12s",
              }}
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isStreaming}
              className="aa-send-btn"
              style={{
                width: 42, height: 42, flexShrink: 0,
                background: inputText.trim() && !isStreaming ? "#111111" : "#E8E8E8",
                border: "none", borderRadius: "50%",
                cursor: inputText.trim() && !isStreaming ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .15s, opacity .15s",
              }}
            >
              {/* Up arrow */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 12V2M2 7L7 2L12 7"
                  stroke={inputText.trim() && !isStreaming ? "#FFFFFF" : "#C0C0C0"}
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        )}

      </div>
    </>
  );
}
