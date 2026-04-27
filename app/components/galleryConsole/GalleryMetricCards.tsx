"use client";
import React from "react";
import { Eye, Bookmark, MessagesSquare, BadgeDollarSign, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GalleryDashboardMetrics } from "../../services/galleryConsole/galleryAnalyticsService";

interface MetricCardsProps {
  metrics: GalleryDashboardMetrics | null;
  loading: boolean;
}

interface CardSpec {
  label:     string;
  ko:        string;
  value:     number;
  change?:   number;
  Icon:      LucideIcon;
  emphasis?: boolean;
}

function formatChange(change?: number): string | null {
  if (change === undefined || !isFinite(change)) return null;
  const pct = Math.round(change * 100);
  if (pct === 0) return "—";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function MetricCard({ spec, loading }: { spec: CardSpec; loading: boolean }) {
  const change = formatChange(spec.change);
  const positive = (spec.change ?? 0) > 0;
  return (
    <div style={{
      background: "#FFFFFF",
      border: `0.5px solid ${spec.emphasis ? "#D9C9A6" : "#E7E2D8"}`,
      borderRadius: 14,
      padding: "18px 20px 16px",
      minWidth: 0,
      transition: "border-color .2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
        <spec.Icon size={14} strokeWidth={1.5} color={spec.emphasis ? "#8A6A3F" : "#6F6F6F"} />
        <span style={{
          fontSize: 10, color: "#6F6F6F", letterSpacing: ".12em",
          textTransform: "uppercase",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          {spec.label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: 28, fontWeight: 700, color: "#111111",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif",
          letterSpacing: "-.02em", lineHeight: 1,
          opacity: loading ? 0.4 : 1,
          transition: "opacity .2s",
        }}>
          {loading ? "—" : spec.value.toLocaleString()}
        </span>
        {change && !loading && (
          <span style={{
            fontSize: 11,
            color: change === "—" ? "#AAA" : positive ? "#7C6A46" : "#A04848",
            letterSpacing: ".02em",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          }}>
            {change}
          </span>
        )}
      </div>
      <p style={{
        fontSize: 10.5, color: "#9A9A9A",
        margin: "8px 0 0", letterSpacing: ".02em",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        {spec.ko}
      </p>
    </div>
  );
}

export function GalleryMetricCards({ metrics, loading }: MetricCardsProps) {
  const cards: CardSpec[] = [
    { label: "Total Views",       ko: "전체 조회수",  value: metrics?.views          ?? 0, change: metrics?.viewsChange,     Icon: Eye },
    { label: "Saves",             ko: "저장 수",       value: metrics?.saves          ?? 0, change: metrics?.savesChange,     Icon: Bookmark },
    { label: "AI Questions",      ko: "AI 질문 수",    value: metrics?.aiQuestions    ?? 0, change: metrics?.questionsChange, Icon: MessagesSquare },
    { label: "Price Questions",   ko: "가격 문의 수",  value: metrics?.priceQuestions ?? 0,                                  Icon: BadgeDollarSign, emphasis: true },
    { label: "High Intent Leads", ko: "고관심 리드",   value: metrics?.highIntentLeads ?? 0,                                 Icon: Flame, emphasis: true },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
      gap: 12,
    }}>
      {cards.map(c => <MetricCard key={c.label} spec={c} loading={loading} />)}
    </div>
  );
}
