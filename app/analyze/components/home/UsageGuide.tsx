"use client";
import React from "react";
import { IcoQr, IcoFileText, IcoImage } from "./icons";

const STEPS = [
  {
    icon: (active: boolean) => <IcoQr size={22} color={active ? "#8A6A3F" : "#888"} />,
    title: "QR 스캔",
    desc: "작품 옆 QR 코드를 스캔하세요",
  },
  {
    icon: (active: boolean) => <IcoFileText size={22} color={active ? "#8A6A3F" : "#888"} />,
    title: "라벨 촬영",
    desc: "작품 설명판을 촬영하세요",
  },
  {
    icon: (active: boolean) => <IcoImage size={22} color={active ? "#8A6A3F" : "#888"} />,
    title: "작품 촬영",
    desc: "작품을 직접 찍으세요",
  },
];

export function UsageGuide() {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section label */}
      <p style={{
        fontSize: 9, color: "#AAAAAA", letterSpacing: ".2em",
        textTransform: "uppercase" as const,
        margin: "0 0 14px",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        전시장에서 이렇게 사용하세요
      </p>

      {/* Steps row */}
      <div style={{ display: "flex", gap: 10 }}>
        {STEPS.map((step, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{
              background: "#fff",
              border: "0.5px solid #EBEBEB",
              borderRadius: 14,
              padding: "14px 12px",
              display: "flex", flexDirection: "column" as const, alignItems: "flex-start", gap: 10,
            }}>
              {/* Step number + icon row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div style={{
                  width: 40, height: 40,
                  background: "#F4EFE5",
                  borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {step.icon(false)}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#D0D0D0",
                  fontFamily: "'KakaoBigSans', system-ui, sans-serif",
                }}>
                  0{i + 1}
                </span>
              </div>

              {/* Text */}
              <div>
                <p style={{
                  fontSize: 12, fontWeight: 700, color: "#111", margin: "0 0 3px",
                  fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                }}>
                  {step.title}
                </p>
                <p style={{
                  fontSize: 10.5, color: "#888", lineHeight: 1.5, margin: 0,
                  fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                }}>
                  {step.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
