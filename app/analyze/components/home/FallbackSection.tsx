"use client";
import React, { useState, useRef } from "react";
import { IcoCamera, IcoFileText, IcoSearch } from "./icons";

interface FallbackSectionProps {
  onCamera: () => void;
  onLabel: () => void;
  onTextSearch: (query: string) => void;
}

const FALLBACK_STYLES = `
  .fbs-btn { transition: background 0.15s, transform 0.15s; }
  .fbs-btn:hover  { background: #F0F0F0 !important; }
  .fbs-btn:active { transform: scale(0.96); }
  .fbs-search-btn:hover  { background: #8A6A3F !important; }
  .fbs-search-btn:active { transform: scale(0.97); }
`;

export function FallbackSection({ onCamera, onLabel, onTextSearch }: FallbackSectionProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchToggle = () => {
    setShowSearch(s => !s);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const handleSubmit = () => {
    if (query.trim()) onTextSearch(query.trim());
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FALLBACK_STYLES }} />
      <div style={{
        background: "#fff",
        border: "0.5px solid #EBEBEB",
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 24,
        boxShadow: "0 4px 30px rgba(0,0,0,0.06)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 18px 14px", borderBottom: "0.5px solid #F2F2F2" }}>
          <p style={{
            fontSize: 9, color: "#AAAAAA", letterSpacing: ".2em",
            textTransform: "uppercase" as const, margin: "0 0 4px",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          }}>
            대안 입력
          </p>
          <p style={{
            fontSize: 13, fontWeight: 600, color: "#111", margin: 0,
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          }}>
            QR이 없거나 인식되지 않나요?
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", borderBottom: showSearch ? "0.5px solid #F2F2F2" : "none" }}>
          {/* 작품 촬영 */}
          <FallbackBtn
            icon={<IcoCamera size={20} color="#444" />}
            title="작품 촬영"
            desc="이미지로 분석"
            onClick={onCamera}
            border="right"
          />
          {/* 설명 촬영 */}
          <FallbackBtn
            icon={<IcoFileText size={20} color="#444" />}
            title="설명 촬영"
            desc="라벨 정보 읽기"
            onClick={onLabel}
            border="right"
          />
          {/* 텍스트 검색 */}
          <FallbackBtn
            icon={<IcoSearch size={20} color={showSearch ? "#8A6A3F" : "#444"} />}
            title="텍스트 검색"
            desc="작가 · 작품명"
            onClick={handleSearchToggle}
            active={showSearch}
          />
        </div>

        {/* Inline search expand */}
        <div style={{
          maxHeight: showSearch ? 120 : 0,
          overflow: "hidden",
          transition: "max-height 0.28s ease",
        }}>
          <div style={{ padding: "14px 16px 16px", display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="작가명 또는 작품명 입력"
              style={{
                flex: 1,
                border: "0.5px solid #D8D8D8",
                borderRadius: 10,
                padding: "11px 14px",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                fontSize: 13, color: "#111",
                background: "#FAFAFA",
                outline: "none",
              }}
            />
            <button
              className="fbs-search-btn"
              onClick={handleSubmit}
              disabled={!query.trim()}
              style={{
                padding: "11px 16px",
                background: query.trim() ? "#8A6A3F" : "#E0E0E0",
                border: "none", borderRadius: 10, cursor: query.trim() ? "pointer" : "default",
                color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                transition: "background 0.15s, transform 0.15s",
                flexShrink: 0,
              }}
            >
              검색
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FallbackBtn({
  icon, title, desc, onClick, border, active = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  border?: "right";
  active?: boolean;
}) {
  return (
    <button
      className="fbs-btn"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "16px 10px 14px",
        background: active ? "#F4EFE5" : "transparent",
        border: "none",
        borderRight: border === "right" ? "0.5px solid #F2F2F2" : "none",
        cursor: "pointer",
        display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8,
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}
    >
      <div style={{
        width: 42, height: 42,
        background: active ? "rgba(138,106,63,0.08)" : "#F6F6F6",
        borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s",
      }}>
        {icon}
      </div>
      <div style={{ textAlign: "center" as const }}>
        <p style={{ fontSize: 11.5, fontWeight: 600, color: active ? "#8A6A3F" : "#222", margin: "0 0 2px" }}>
          {title}
        </p>
        <p style={{ fontSize: 10, color: "#999", margin: 0, lineHeight: 1.4 }}>
          {desc}
        </p>
      </div>
    </button>
  );
}
