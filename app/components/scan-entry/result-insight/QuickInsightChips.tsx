"use client";
import React from "react";
import { useLanguage } from "../../../i18n/useLanguage";
import type { QuickInsight, PhysicalStatus } from "../shared/scanTypes";

interface Props {
  insight:  QuickInsight;
  /** "light" — black text on white pills (cards / light surfaces).
   *  "dark"  — white text on glass pills (AI overlay surfaces). */
  variant?: "light" | "dark";
}

/**
 * Compact chip row summarizing a QuickInsight. Mock / unverified
 * insights always render a soft "Draft" chip first — never a
 * "Verified" pill, never a green checkmark.
 */
export function QuickInsightChips({ insight, variant = "light" }: Props) {
  const { lang } = useLanguage();
  const isDraft  = insight.isMock || !insight.isVerified;

  const chips: { key: string; label: string; tone?: "draft" | "neutral" | "physical" }[] = [];

  if (isDraft) {
    chips.push({ key: "draft", label: lang === "ko" ? "초안" : "Draft", tone: "draft" });
  }
  if (insight.artist) chips.push({ key: "artist", label: insight.artist });
  if (insight.year)   chips.push({ key: "year",   label: insight.year });
  if (insight.medium) chips.push({ key: "medium", label: insight.medium });

  if (insight.physicalStatus) {
    chips.push({
      key:   "physical",
      label: physicalStatusLabel(insight.physicalStatus, lang),
      tone:  "physical",
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5" role="list">
      {chips.map((chip) => (
        <li key={chip.key}>
          <span className={chipClass(chip.tone, variant)}>{chip.label}</span>
        </li>
      ))}
    </ul>
  );
}

function chipClass(tone: "draft" | "neutral" | "physical" | undefined, variant: "light" | "dark") {
  /* max-w-full + Korean-aware wrap so a single long chip (e.g. a
     compound artist hint from the API) never overflows its parent
     on a 320px viewport. inline-flex keeps the pill shape; if the
     content wraps, both lines stay inside the same chip. */
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] tracking-[0.04em] max-w-full [overflow-wrap:anywhere] [word-break:keep-all]";

  if (variant === "dark") {
    if (tone === "draft") {
      return `${base} bg-white/10 text-white/80 border-[0.5px] border-white/15`;
    }
    if (tone === "physical") {
      return `${base} bg-violet-400/15 text-violet-200 border-[0.5px] border-violet-300/30`;
    }
    return `${base} bg-white/[0.06] text-white/90 border-[0.5px] border-white/15`;
  }

  if (tone === "draft") {
    return `${base} bg-black/[0.06] text-ink/70 border-[0.5px] border-border`;
  }
  if (tone === "physical") {
    return `${base} bg-violet-500/[0.08] text-violet-700 border-[0.5px] border-violet-500/25`;
  }
  return `${base} bg-white text-ink border-[0.5px] border-border`;
}

function physicalStatusLabel(status: PhysicalStatus, lang: string) {
  if (lang === "ko") {
    switch (status) {
      case "tag_connected": return "태그 연결됨";
      case "lidar_scanned": return "LiDAR 스캔";
      case "unverified":    return "미확인";
    }
  }
  switch (status) {
    case "tag_connected": return "Tag connected";
    case "lidar_scanned": return "LiDAR scanned";
    case "unverified":    return "Unverified";
  }
}
