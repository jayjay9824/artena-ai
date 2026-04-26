"use client";
import React, { useRef, useState } from "react";
import { IcoUpload, IcoCamera, IcoSearch } from "./icons";

interface SecondaryInputGridProps {
  onFileSelected: (file: File) => void;
  onCamera: () => void;
  onTextSearch: (q: string) => void;
}

const GRID_STYLES = `
  .sig-btn { transition: background 0.15s, transform 0.15s; }
  .sig-btn:hover  { background: #EDEDED !important; }
  .sig-btn:active { transform: scale(0.95); }
  .sig-search-submit:hover  { background: #8A6A3F !important; }
  .sig-search-submit:active { transform: scale(0.97); }
`;

export function SecondaryInputGrid({ onFileSelected, onCamera, onTextSearch }: SecondaryInputGridProps) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [query,      setQuery]      = useState("");

  const handleSearchToggle = () => {
    const next = !showSearch;
    setShowSearch(next);
    if (next) setTimeout(() => inputRef.current?.focus(), 120);
  };

  const handleSubmit = () => {
    const q = query.trim();
    if (!q) return;
    onTextSearch(q);
  };

  const ITEMS = [
    {
      key: "upload",
      icon: <IcoUpload size={18} color="#666" />,
      label: "이미지 업로드",
      sub: "JPG / PNG / WEBP",
      onClick: () => fileRef.current?.click(),
      active: false,
    },
    {
      key: "camera",
      icon: <IcoCamera size={18} color="#666" />,
      label: "카메라 촬영",
      sub: "직접 찍기",
      onClick: onCamera,
      active: false,
    },
    {
      key: "search",
      icon: <IcoSearch size={18} color={showSearch ? "#8A6A3F" : "#666"} />,
      label: "텍스트 검색",
      sub: "작가·작품 검색",
      onClick: handleSearchToggle,
      active: showSearch,
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GRID_STYLES }} />

      {/* Section label */}
      <p style={{
        fontSize: 9, color: "#BBBBBB", letterSpacing: ".2em",
        textTransform: "uppercase" as const,
        margin: "0 0 10px",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        추가 입력 방법
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: showSearch ? 10 : 28 }}>
        {ITEMS.map(item => (
          <button
            key={item.key}
            className="sig-btn"
            onClick={item.onClick}
            style={{
              flex: 1,
              padding: "12px 6px",
              background: item.active ? "#F4EFE5" : "#F6F6F6",
              border: `0.5px solid ${item.active ? "#D9C9A6" : "#E8E8E8"}`,
              borderRadius: 12,
              cursor: "pointer",
              display: "flex", flexDirection: "column" as const,
              alignItems: "center", gap: 7,
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              transition: "background .15s, border-color .15s",
            }}
          >
            <div style={{
              width: 34, height: 34,
              background: "#fff",
              borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
            }}>
              {item.icon}
            </div>
            <div style={{ textAlign: "center" as const }}>
              <p style={{
                fontSize: 11, fontWeight: 600,
                color: item.active ? "#8A6A3F" : "#333",
                margin: "0 0 1px",
              }}>
                {item.label}
              </p>
              <p style={{ fontSize: 9.5, color: "#AAA", margin: 0 }}>{item.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Inline search expand */}
      <div style={{
        maxHeight: showSearch ? 80 : 0,
        overflow: "hidden",
        transition: "max-height 0.28s ease",
        marginBottom: showSearch ? 28 : 0,
      }}>
        <div style={{ display: "flex", gap: 8 }}>
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
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="sig-search-submit"
            style={{
              padding: "11px 16px",
              background: query.trim() ? "#8A6A3F" : "#E0E0E0",
              border: "none", borderRadius: 10,
              cursor: query.trim() ? "pointer" : "default",
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

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => { if (e.target.files?.[0]) onFileSelected(e.target.files[0]); }}
      />
    </>
  );
}
