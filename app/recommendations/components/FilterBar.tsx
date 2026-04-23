"use client";
import React from "react";
import { ActiveFilter, FilterKey, FILTER_OPTIONS } from "../types/recommendation";

interface FilterBarProps {
  activeFilter: ActiveFilter;
  onFilter: (key: FilterKey, value: string) => void;
}

const CHIPS: Array<{ key: FilterKey; value: string; label: string }> = [
  { key: "all", value: "all", label: "All" },
  ...FILTER_OPTIONS.style.map(v => ({ key: "style" as FilterKey, value: v, label: v })),
  ...FILTER_OPTIONS.market.map(v => ({ key: "market" as FilterKey, value: v, label: v })),
  ...FILTER_OPTIONS.medium.map(v => ({ key: "medium" as FilterKey, value: v, label: v })),
];

export function FilterBar({ activeFilter, onFilter }: FilterBarProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `.rec-filter-scroll::-webkit-scrollbar{display:none}` }} />
      <div
        className="rec-filter-scroll"
        style={{
          display: "flex", gap: 6, overflowX: "auto",
          padding: "14px 22px", borderBottom: "0.5px solid #F0F0F0",
          scrollbarWidth: "none",
        }}
      >
        {CHIPS.map(chip => {
          const isActive = activeFilter.key === chip.key && activeFilter.value === chip.value;
          return (
            <button
              key={`${chip.key}-${chip.value}`}
              onClick={() => onFilter(chip.key, chip.value)}
              style={{
                flexShrink: 0, padding: "6px 14px",
                fontSize: 10, letterSpacing: ".06em",
                border: isActive ? "1px solid #1a1a18" : "0.5px solid #E8E8E8",
                background: isActive ? "#1a1a18" : "transparent",
                color: isActive ? "#FFFFFF" : "#777",
                cursor: "pointer",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                transition: "all .14s",
                whiteSpace: "nowrap",
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
