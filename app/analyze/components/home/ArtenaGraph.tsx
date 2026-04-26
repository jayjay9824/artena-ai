"use client";
import React from "react";

const GRAPH_STYLES = `
  @keyframes centerPulse {
    0%, 100% { opacity: 0.18; r: 28; }
    50%       { opacity: 0.06; r: 40; }
  }
  @keyframes lineDash {
    0%   { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes nodeAppear {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes labelFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

const NODES = [
  { cx: 55,  cy: 42,  label: "Artist",        sub: "작가",     delay: 0.1 },
  { cx: 255, cy: 42,  label: "Exhibition",    sub: "전시",     delay: 0.2 },
  { cx: 290, cy: 125, label: "Gallery",       sub: "갤러리",   delay: 0.3 },
  { cx: 220, cy: 190, label: "Market",        sub: "시장 데이터", delay: 0.4 },
  { cx: 80,  cy: 190, label: "Cultural",      sub: "문화 공간", delay: 0.5 },
];

// Line length for dasharray (approximate)
function lineLen(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2).toFixed(1);
}

const CENTER = { cx: 170, cy: 116 };

export function ArtenaGraph() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GRAPH_STYLES }} />
      <div style={{ marginBottom: 32 }}>
        {/* Label */}
        <p style={{
          fontSize: 9, color: "#AAAAAA", letterSpacing: ".2em",
          textTransform: "uppercase" as const,
          margin: "0 0 14px",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          ARTENA가 읽는 데이터
        </p>

        <div style={{
          background: "#fff",
          border: "0.5px solid #EBEBEB",
          borderRadius: 20,
          padding: "8px 0 16px",
          overflow: "hidden",
          boxShadow: "0 4px 30px rgba(0,0,0,0.06)",
        }}>
          <svg
            viewBox="0 0 340 235"
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            {/* Connecting lines */}
            {NODES.map((n, i) => {
              const len = lineLen(CENTER.cx, CENTER.cy, n.cx, n.cy);
              return (
                <line
                  key={i}
                  x1={CENTER.cx} y1={CENTER.cy}
                  x2={n.cx} y2={n.cy}
                  stroke="#D8E4F8"
                  strokeWidth="1"
                  strokeDasharray={len}
                  strokeDashoffset={len}
                  style={{
                    animation: `lineDash 0.7s ease forwards ${n.delay + 0.1}s`,
                  }}
                />
              );
            })}

            {/* Center glow ring */}
            <circle
              cx={CENTER.cx} cy={CENTER.cy}
              r="28"
              fill="rgba(0,122,255,0.07)"
              style={{ animation: "centerPulse 3s ease-in-out infinite" }}
            />

            {/* Center node */}
            <circle
              cx={CENTER.cx} cy={CENTER.cy}
              r="22"
              fill="#007AFF"
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,122,255,0.3))" }}
            />
            <text
              x={CENTER.cx} y={CENTER.cy - 3}
              textAnchor="middle"
              fill="#fff"
              fontSize="9"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
              letterSpacing=".04em"
            >
              Artwork
            </text>
            <text
              x={CENTER.cx} y={CENTER.cy + 9}
              textAnchor="middle"
              fill="rgba(255,255,255,0.65)"
              fontSize="7.5"
              fontFamily="system-ui, sans-serif"
            >
              작품
            </text>

            {/* Satellite nodes */}
            {NODES.map((n, i) => (
              <g key={i} style={{ animation: `nodeAppear 0.4s ease forwards ${n.delay + 0.05}s`, opacity: 0 }}>
                {/* Outer ring */}
                <circle cx={n.cx} cy={n.cy} r="17" fill="rgba(0,122,255,0.05)" stroke="#D8E4F8" strokeWidth="0.8" />
                {/* Inner circle */}
                <circle cx={n.cx} cy={n.cy} r="12" fill="#F4F8FF" />
                {/* Label below */}
                <text
                  x={n.cx} y={n.cy - 1}
                  textAnchor="middle"
                  fill="#007AFF"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  letterSpacing=".03em"
                  style={{ animation: `labelFadeIn 0.4s ease forwards ${n.delay + 0.3}s`, opacity: 0 }}
                >
                  {n.label}
                </text>
                <text
                  x={n.cx}
                  y={n.cy + 28}
                  textAnchor="middle"
                  fill="#999"
                  fontSize="8"
                  fontFamily="system-ui, sans-serif"
                  style={{ animation: `labelFadeIn 0.4s ease forwards ${n.delay + 0.35}s`, opacity: 0 }}
                >
                  {n.sub}
                </text>
              </g>
            ))}
          </svg>

          {/* Description */}
          <p style={{
            fontSize: 12, color: "#888", lineHeight: 1.65,
            margin: "0 20px",
            textAlign: "center" as const,
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          }}>
            회화뿐 아니라 건축물·유적지·문화공간까지<br />맥락과 시장 데이터를 함께 분석합니다.
          </p>
        </div>
      </div>
    </>
  );
}
