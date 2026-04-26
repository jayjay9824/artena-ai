"use client";
import React, { useRef } from "react";
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
`;

export function SecondaryInputGrid({ onFileSelected, onCamera, onTextSearch }: SecondaryInputGridProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const ITEMS = [
    {
      icon: <IcoUpload size={18} color="#666" />,
      label: "이미지 업로드",
      sub: "JPG / PNG / WEBP",
      onClick: () => fileRef.current?.click(),
    },
    {
      icon: <IcoCamera size={18} color="#666" />,
      label: "카메라 촬영",
      sub: "직접 찍기",
      onClick: onCamera,
    },
    {
      icon: <IcoSearch size={18} color="#666" />,
      label: "텍스트 검색",
      sub: "작가·작품 검색",
      onClick: () => onTextSearch(""),
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

      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {ITEMS.map((item, i) => (
          <button
            key={i}
            className="sig-btn"
            onClick={item.onClick}
            style={{
              flex: 1,
              padding: "12px 6px",
              background: "#F6F6F6",
              border: "0.5px solid #E8E8E8",
              borderRadius: 12,
              cursor: "pointer",
              display: "flex", flexDirection: "column" as const,
              alignItems: "center", gap: 7,
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
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
              <p style={{ fontSize: 11, fontWeight: 600, color: "#333", margin: "0 0 1px" }}>{item.label}</p>
              <p style={{ fontSize: 9.5, color: "#AAA", margin: 0 }}>{item.sub}</p>
            </div>
          </button>
        ))}
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
