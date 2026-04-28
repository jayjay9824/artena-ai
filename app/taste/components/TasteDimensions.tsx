"use client";
import React, { useEffect, useState } from "react";
import { TasteDimension } from "../types/taste";
import { useLanguage } from "../../i18n/useLanguage";

const DIMENSION_STYLES = `
  @keyframes dim-grow { from { width: 0% } }
`;

function descriptor(dim: TasteDimension): string {
  if (dim.value >= 62) return dim.rightPole;
  if (dim.value <= 38) return dim.leftPole;
  return "Balanced";
}

function DimensionRow({ dim, delay }: { dim: TasteDimension; delay: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);

  const label = descriptor(dim);
  const isRight = dim.value >= 62;
  const isLeft  = dim.value <= 38;
  const accentColor = isRight ? "#8A6A3F" : isLeft ? "#888" : "#AAAAAA";

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Labels row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
        <span style={{
          fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase",
          color: "#AAAAAA", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          {dim.label}
        </span>
        <span style={{
          fontSize: 10, letterSpacing: ".06em",
          color: accentColor, fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          fontWeight: 500,
          transition: "color .3s",
        }}>
          {label}
        </span>
      </div>

      {/* Bar */}
      <div style={{ position: "relative", height: 2, background: "#F0F0F0" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: mounted ? `${dim.value}%` : "0%",
          background: `linear-gradient(to right, ${accentColor}30, ${accentColor})`,
          transition: `width 0.95s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
        }} />
        {/* Dot */}
        <div style={{
          position: "absolute", top: "50%",
          left: mounted ? `${dim.value}%` : "0%",
          transform: "translate(-50%, -50%)",
          width: 6, height: 6, borderRadius: "50%",
          background: accentColor,
          boxShadow: `0 0 0 2.5px #fff, 0 0 0 4px ${accentColor}22`,
          transition: `left 0.95s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
          zIndex: 1,
        }} />
      </div>

      {/* Poles (minimal, only shown on hover via CSS — here just static tiny) */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 8, color: "#D8D8D8", letterSpacing: ".06em" }}>{dim.leftPole}</span>
        <span style={{ fontSize: 8, color: "#D8D8D8", letterSpacing: ".06em" }}>{dim.rightPole}</span>
      </div>
    </div>
  );
}

interface TasteDimensionsProps {
  dimensions: TasteDimension[];
}

export function TasteDimensions({ dimensions }: TasteDimensionsProps) {
  const { t } = useLanguage();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DIMENSION_STYLES }} />
      <div style={{ padding: "30px 22px 28px", borderBottom: "0.5px solid #F2F2F2" }}>
        <p style={{
          fontSize: 9, color: "#BBBBBB", letterSpacing: ".22em", textTransform: "uppercase",
          margin: "0 0 28px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          {t("taste.dimensions_title")}
        </p>

        {dimensions.map((dim, i) => (
          <DimensionRow key={dim.key} dim={dim} delay={i * 100} />
        ))}
      </div>
    </>
  );
}
