"use client";
import React from "react";
import { Calendar, User, Tag, ArrowUpDown } from "lucide-react";
import type { Artwork } from "../../lib/types";
import type { RangeKey } from "../../services/galleryConsole/galleryAnalyticsService";
import type { SortKey } from "../../services/galleryConsole/artworkPerformanceService";
import { MOCK_ARTISTS } from "../../services/galleryConsole/mockData";

interface GalleryFiltersProps {
  range:        RangeKey;
  onRange:      (r: RangeKey) => void;
  artistId?:    string;
  onArtist:     (id: string | undefined) => void;
  availability?: Artwork["availabilityStatus"];
  onAvailability: (a: Artwork["availabilityStatus"] | undefined) => void;
  sort?:        SortKey;
  onSort:       (s: SortKey) => void;
}

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7d",  label: "지난 7일"  },
  { value: "30d", label: "지난 30일" },
  { value: "90d", label: "지난 90일" },
  { value: "all", label: "전체"     },
];

const AVAIL_OPTIONS: { value: Artwork["availabilityStatus"]; label: string }[] = [
  { value: "available",     label: "Available" },
  { value: "reserved",      label: "Reserved"  },
  { value: "sold",          label: "Sold"      },
  { value: "not_for_sale",  label: "Not for Sale" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "leadScore",      label: "Lead Score" },
  { value: "views",          label: "Views" },
  { value: "saves",          label: "Saves" },
  { value: "aiQuestions",    label: "AI Questions" },
  { value: "priceQuestions", label: "Price Questions" },
];

const labelStyle: React.CSSProperties = {
  fontSize: 9, color: "#9A9A9A", letterSpacing: ".12em",
  textTransform: "uppercase",
  fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
  display: "flex", alignItems: "center", gap: 6,
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "0.5px solid #E7E2D8",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 12, color: "#1C1A17",
  fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
  cursor: "pointer",
  appearance: "none",
};

export function GalleryFilters({
  range, onRange,
  artistId, onArtist,
  availability, onAvailability,
  sort, onSort,
}: GalleryFiltersProps) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 12,
      padding: "16px",
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 14,
    }}>
      <div>
        <p style={labelStyle}><Calendar size={11} strokeWidth={1.5} /> 기간</p>
        <select
          value={range}
          onChange={e => onRange(e.target.value as RangeKey)}
          style={selectStyle}
        >
          {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <p style={labelStyle}><User size={11} strokeWidth={1.5} /> 작가</p>
        <select
          value={artistId ?? ""}
          onChange={e => onArtist(e.target.value || undefined)}
          style={selectStyle}
        >
          <option value="">전체</option>
          {MOCK_ARTISTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div>
        <p style={labelStyle}><Tag size={11} strokeWidth={1.5} /> 판매 상태</p>
        <select
          value={availability ?? ""}
          onChange={e => onAvailability((e.target.value || undefined) as Artwork["availabilityStatus"] | undefined)}
          style={selectStyle}
        >
          <option value="">전체</option>
          {AVAIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <p style={labelStyle}><ArrowUpDown size={11} strokeWidth={1.5} /> 정렬</p>
        <select
          value={sort ?? "leadScore"}
          onChange={e => onSort(e.target.value as SortKey)}
          style={selectStyle}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
