"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { QRAnalysis } from "../QuickReport";
import type { MarketIntelligenceData } from "../MarketIntelligenceReport";
import type { ChatMessage, QuestionType, SuggestedQuestion } from "../../../types/assistant";
import { trackEvent, makeArtworkId } from "../../lib/analytics";

/* ── Signal detection ─────────────────────────────────────────────────────── */

type MarketPosition = "Emerging" | "Established" | "Blue-chip";

function deriveMarketPosition(a: QRAnalysis): MarketPosition {
  if (a.category === "architecture" || a.category === "artifact" || a.category === "cultural_site") {
    return "Established";
  }
  const note    = (a.marketNote ?? "").toLowerCase();
  const auCount = a.auctions?.length    ?? 0;
  const colCount= a.collections?.length ?? 0;
  if (note.includes("blue-chip") || (auCount >= 6 && colCount >= 5)) return "Blue-chip";
  if (note.includes("emerging") || note.includes("신진") || (auCount === 0 && colCount <= 1)) return "Emerging";
  return "Established";
}

/** Topical signals derived from style + keywords */
function deriveTopics(a: QRAnalysis): Set<string> {
  const haystack = [
    a.style ?? "",
    ...(a.keywords ?? []),
    a.description ?? "",
  ].join(" ").toLowerCase();

  const topics = new Set<string>();
  if (/(풍경|산수|landscape|scenery)/.test(haystack))           topics.add("landscape");
  if (/(초상|portrait|figure|얼굴)/.test(haystack))              topics.add("portrait");
  if (/(추상|abstract)/.test(haystack))                          topics.add("abstract");
  if (/(정물|still life|still-life)/.test(haystack))             topics.add("still_life");
  if (/(미니멀|minimal)/.test(haystack))                         topics.add("minimal");
  if (/(개념|conceptual|conceptualism)/.test(haystack))          topics.add("conceptual");
  if (/(설치|installation)/.test(haystack))                      topics.add("installation");
  if (/(사진|photograph)/.test(haystack))                        topics.add("photography");
  if (/(조각|sculpture)/.test(haystack))                         topics.add("sculpture");
  return topics;
}

/* ── Suggested questions — signal-driven ──────────────────────────────────── */

function getSuggestedQuestions(a: QRAnalysis): SuggestedQuestion[] {
  // Architecture / artifact / cultural site flows stay category-driven.
  if (a.category === "architecture") {
    return [
      { text: "이 건축물의 역사적 의의는 무엇인가요?", type: "interpretation" },
      { text: "건축 양식의 특징을 설명해줘",         type: "interpretation" },
      { text: "같은 건축가의 다른 대표작은?",         type: "comparison"     },
      { text: "왜 세계유산으로 지정됐나요?",          type: "market"         },
      { text: "비슷한 건축물을 추천해줘",             type: "recommendation" },
    ];
  }
  if (a.category === "artifact" || a.category === "cultural_site") {
    return [
      { text: "이 유물의 문화적 의의는?",      type: "interpretation" },
      { text: "어느 시대 작품인가요?",         type: "interpretation" },
      { text: "현재 어디서 볼 수 있나요?",      type: "market"         },
      { text: "비슷한 문화재를 추천해줘",       type: "recommendation" },
      { text: "이 유물이 중요한 이유는?",      type: "market"         },
    ];
  }

  // Artwork — build a 5-chip set tuned to market position + topical signals.
  const position = deriveMarketPosition(a);
  const topics   = deriveTopics(a);
  const out: SuggestedQuestion[] = [];

  // Lead chip — always interpretation, but phrasing depends on position.
  out.push(
    position === "Emerging"
      ? { text: "이 작가의 작업 세계는 어떤 흐름인가요?", type: "interpretation" }
      : { text: "이 작품 왜 중요한가요?",              type: "interpretation" }
  );

  // Market chip — phrasing depends on data depth.
  if (position === "Blue-chip") {
    out.push({ text: "최근 5년 경매 가격 흐름은 어떤가요?", type: "market" });
  } else if (position === "Emerging") {
    out.push({ text: "초기 컬렉터들에게 이 작가는 어떤 의미인가요?", type: "market" });
  } else {
    out.push({ text: "시장 가치는 어떻게 보나요?", type: "market" });
  }

  // Comparison chip — emerging artists need similar-style discovery,
  // established/blue-chip benefit from "other major works".
  out.push(
    position === "Emerging"
      ? { text: "유사한 스타일로 작업하는 작가는?", type: "comparison" }
      : { text: "이 작가의 다른 대표작은?",        type: "comparison" }
  );

  // Topical chip — strongest signal wins.
  if (topics.has("landscape")) {
    out.push({ text: "이 장소는 어디인가요?", type: "interpretation" });
  } else if (topics.has("portrait")) {
    out.push({ text: "그려진 인물은 누구인가요?", type: "interpretation" });
  } else if (topics.has("abstract") || topics.has("conceptual")) {
    out.push({ text: "어떤 개념을 다루는 작품인가요?", type: "interpretation" });
  } else if (topics.has("installation")) {
    out.push({ text: "어떤 공간에 설치되었던 작업인가요?", type: "interpretation" });
  } else {
    out.push({ text: "비슷한 작가를 추천해줘", type: "recommendation" });
  }

  // Closing chip — purchase-intent signal (also feeds Data Flywheel later).
  out.push(
    position === "Blue-chip"
      ? { text: "지금 구매하기에 적정한 가격대인가요?",  type: "market" }
      : { text: "왜 나에게 추천된 작품인가요?",         type: "taste_profile" }
  );

  return out;
}

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
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function ArtAssistantScreen({
  analysis,
  imagePreview,
  reportData,
  onClose,
}: ArtAssistantScreenProps) {
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [streamingContent, setStreaming]    = useState("");
  const [isStreaming, setIsStreaming]        = useState(false);
  const [inputText, setInputText]            = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const suggestedQuestions = getSuggestedQuestions(analysis);

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
    const artworkId = makeArtworkId({
      title:  analysis.title,
      artist: analysis.artist,
      year:   analysis.year,
    });
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

      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: accumulated || "답변을 생성하지 못했습니다.",
          timestamp: new Date().toISOString(),
        },
      ]);
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
  }, [messages, isStreaming, analysis, reportData]);

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

          {/* Intro + Suggested Questions */}
          {messages.length === 0 && (
            <div style={{ marginBottom: 30 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 22 }}>
                <span style={{ fontSize: 8, color: "#8A6A3F", marginTop: 5, flexShrink: 0 }}>◆</span>
                <p style={{ fontSize: 13, color: "#444", lineHeight: 1.75, margin: 0 }}>
                  이 {analysis.category === "architecture" ? "건축물" : (analysis.category === "artifact" || analysis.category === "cultural_site") ? "유물" : "작품"}에
                  대해 더 깊이 알아보세요. 아래 질문을 선택하거나 직접 입력해 주세요.
                </p>
              </div>

              {/* Suggested chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q.text}
                    onClick={() => sendMessage(q.text, q.type, true)}
                    className="aa-chip"
                    style={{
                      padding: "9px 16px",
                      background: "#FFFFFF",
                      border: "0.5px solid #E2E2E2",
                      borderRadius: 22,
                      cursor: "pointer",
                      fontSize: 12, color: "#333",
                      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                      letterSpacing: "-.01em",
                      lineHeight: 1.4,
                      transition: "background .12s, border-color .12s",
                      textAlign: "left" as const,
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

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ─────────────────────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderTop: "0.5px solid #EDEDED",
          padding: "12px 16px 28px",
          flexShrink: 0,
        }}>
          {/* Context reminder */}
          {messages.length > 0 && (
            <p style={{
              fontSize: 9, color: "#CCCCCC", letterSpacing: ".06em",
              margin: "0 0 8px 4px",
            }}>
              ◆ {analysis.artist || "작가"} · {analysis.title || "작품"} 기준으로 답변 중
            </p>
          )}

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
              placeholder="이 작품에 대해 더 물어보세요"
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

      </div>
    </>
  );
}
