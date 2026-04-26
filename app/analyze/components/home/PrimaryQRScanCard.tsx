"use client";
import React from "react";
import { IcoQr } from "./icons";

const STYLES = `
  @keyframes shimmerQR {
    0%   { transform: translateX(-160%) skewX(-12deg); }
    100% { transform: translateX(220%)  skewX(-12deg); }
  }
  @keyframes qrGlow {
    0%, 100% { opacity: 0.55; }
    50%       { opacity: 0.20; }
  }
  .pqr-card { transition: transform 0.2s ease-out, box-shadow 0.2s ease-out; }
  .pqr-card:hover  { transform: scale(1.02); box-shadow: 0 6px 30px rgba(0,122,255,0.06) !important; }
  .pqr-card:active { transform: scale(0.97); }
  .pqr-btn:hover   { opacity: 0.88; }
  .pqr-btn:active  { transform: scale(0.97); }
`;

export function PrimaryQRScanCard({ onScan }: { onScan: () => void }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        className="pqr-card"
        onClick={onScan}
        style={{
          background: "linear-gradient(145deg, #EDF4FF 0%, #F7FAFF 55%, #ECF3FF 100%)",
          border: "1px solid #CCE0FF",
          borderRadius: 20,
          padding: "24px 22px 22px",
          cursor: "pointer",
          boxShadow: "0 4px 28px rgba(0,122,255,0.07)",
          marginBottom: 24,
          userSelect: "none" as const,
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>

          {/* QR icon with shimmer */}
          <div style={{
            width: 62, height: 62,
            background: "#FFFFFF",
            borderRadius: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 14px rgba(0,122,255,0.14)",
            position: "relative" as const, overflow: "hidden",
            flexShrink: 0,
          }}>
            <IcoQr size={34} color="#007AFF" />
            {/* Pulse ring behind icon */}
            <div style={{
              position: "absolute" as const, inset: -6,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,122,255,0.12) 0%, transparent 70%)",
              animation: "qrGlow 2.8s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {/* Moving shimmer */}
            <div style={{
              position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
              animation: "shimmerQR 2.6s ease-in-out infinite",
              pointerEvents: "none",
            }} />
          </div>

          {/* Badge */}
          <span style={{
            fontSize: 9, letterSpacing: ".16em", color: "#007AFF",
            textTransform: "uppercase" as const,
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            background: "rgba(0,122,255,0.09)",
            padding: "4px 11px", borderRadius: 20,
            fontWeight: 600,
          }}>
            스캔 시작
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 7px",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif",
          letterSpacing: "-.015em",
        }}>
          작품 QR 스캔
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 13, color: "#555", lineHeight: 1.62, margin: "0 0 18px",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          작품, 작품 옆 설명, QR 코드를 스캔하면<br />
          작품 정보와 전시 맥락을 자동으로 분석합니다.
        </p>

        {/* CTA button */}
        <button
          className="pqr-btn"
          onClick={(e) => { e.stopPropagation(); onScan(); }}
          style={{
            width: "100%", padding: "14px 0",
            background: "#007AFF", border: "none",
            borderRadius: 12, cursor: "pointer",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: ".03em",
            marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "opacity 0.15s, transform 0.15s",
            boxShadow: "0 3px 14px rgba(0,122,255,0.32)",
          }}
        >
          <IcoQr size={16} color="#fff" />
          QR 스캔 시작
        </button>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {["작품 정보 자동 추출", "전시 / 갤러리 맥락", "시장 데이터 연결"].map(label => (
            <span key={label} style={{
              fontSize: 10, color: "#007AFF",
              background: "rgba(0,122,255,0.08)",
              padding: "4px 10px", borderRadius: 20,
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              letterSpacing: ".02em",
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
