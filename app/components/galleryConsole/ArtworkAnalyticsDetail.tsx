"use client";
import React from "react";
import { X, Eye, Heart, Bookmark, Share2, FolderPlus, MessagesSquare, BadgeDollarSign, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PerformanceRow } from "../../services/galleryConsole/artworkPerformanceService";

interface DetailProps {
  row:     PerformanceRow | null;
  onClose: () => void;
}

interface MetricSpec {
  Icon:  LucideIcon;
  label: string;
  value: number;
  emphasis?: boolean;
}

function MetricRow({ spec }: { spec: MetricSpec }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0",
      borderBottom: "0.5px solid #F1ECE0",
    }}>
      <spec.Icon
        size={14}
        strokeWidth={1.5}
        color={spec.emphasis ? "#8A6A3F" : "#6F6F6F"}
      />
      <span style={{
        flex: 1, fontSize: 12, color: "#1C1A17",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        {spec.label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 700, color: spec.emphasis ? "#8A6A3F" : "#1C1A17",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        fontVariantNumeric: "tabular-nums",
      }}>
        {spec.value.toLocaleString()}
      </span>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  available: "Available", reserved: "Reserved", sold: "Sold", not_for_sale: "Not for Sale",
};
const PRICE_LABEL: Record<string, string> = {
  public: "Public", on_request: "On Request", private: "Private",
};

export function ArtworkAnalyticsDetail({ row, onClose }: DetailProps) {
  if (!row) {
    return (
      <aside style={{
        background: "#FFFFFF",
        border: "0.5px solid #E7E2D8",
        borderRadius: 14,
        padding: "60px 24px",
        textAlign: "center" as const,
        color: "#9A9A9A", fontSize: 12,
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        Select an artwork from the table to see detail analytics.
      </aside>
    );
  }

  const a = row.analytics;
  const metrics: MetricSpec[] = [
    { Icon: Eye,             label: "조회수",        value: a.views },
    { Icon: Heart,           label: "좋아요",        value: a.likes },
    { Icon: Bookmark,        label: "저장",          value: a.saves },
    { Icon: FolderPlus,      label: "컬렉션 추가",   value: a.collectionAdds, emphasis: a.collectionAdds > 0 },
    { Icon: Share2,          label: "공유",          value: a.shares },
    { Icon: MessagesSquare,  label: "AI 질문",       value: a.aiQuestions },
    { Icon: BadgeDollarSign, label: "가격 질문",     value: a.priceQuestions, emphasis: a.priceQuestions > 0 },
    { Icon: Phone,           label: "문의 클릭",     value: a.inquiryClicks,  emphasis: a.inquiryClicks > 0 },
  ];

  return (
    <aside style={{
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px 16px",
        borderBottom: "0.5px solid #E7E2D8",
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <div style={{
          width: 48, height: 48, flexShrink: 0,
          background: "#F4EFE5",
          border: "0.5px solid #E7E2D8",
          borderRadius: 6,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: "#1C1A17",
            letterSpacing: "-.005em",
            fontFamily: "'KakaoBigSans', system-ui, sans-serif",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {row.artwork.title}
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: "#6F6F6F" }}>
            {row.artistName}{row.artwork.year ? ` · ${row.artwork.year}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 28, height: 28, padding: 0,
            background: "transparent", border: "none",
            cursor: "pointer", color: "#9A9A9A",
            flexShrink: 0,
          }}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Status row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        borderBottom: "0.5px solid #E7E2D8",
      }}>
        <div style={{ padding: "12px 20px", borderRight: "0.5px solid #E7E2D8" }}>
          <p style={{ fontSize: 9, color: "#9A9A9A", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Availability
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1C1A17", margin: 0 }}>
            {STATUS_LABEL[row.artwork.availabilityStatus] ?? row.artwork.availabilityStatus}
          </p>
        </div>
        <div style={{ padding: "12px 20px" }}>
          <p style={{ fontSize: 9, color: "#9A9A9A", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Price Visibility
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1C1A17", margin: 0 }}>
            {PRICE_LABEL[row.artwork.priceVisibility] ?? row.artwork.priceVisibility}
          </p>
        </div>
      </div>

      {/* Lead score */}
      <div style={{ padding: "16px 20px", borderBottom: "0.5px solid #E7E2D8" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{
            fontSize: 9, color: "#9A9A9A", letterSpacing: ".12em",
            textTransform: "uppercase",
          }}>
            Lead Score
          </span>
          <span style={{
            fontSize: 22, fontWeight: 700, color: "#1C1A17",
            fontFamily: "'KakaoBigSans', system-ui, sans-serif",
            fontVariantNumeric: "tabular-nums",
          }}>
            {a.leadScore}
          </span>
        </div>
        <div style={{ height: 4, background: "#F4F1EA", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${Math.max(2, a.leadScore)}%`, height: "100%",
            background: a.leadScore >= 70 ? "#8A6A3F" : a.leadScore >= 40 ? "#B89765" : "#C8C2B5",
            transition: "width .3s ease",
          }} />
        </div>
      </div>

      {/* Metrics list */}
      <div style={{ padding: "8px 20px 16px" }}>
        {metrics.map(m => <MetricRow key={m.label} spec={m} />)}
      </div>
    </aside>
  );
}
