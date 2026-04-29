"use client";
import React from "react";
import type { CollectionAnalysis } from "../../collection/hooks/useCollection";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

interface Props {
  analysis: CollectionAnalysis;
}

interface Row {
  label: string;
  value: string;
}

/**
 * STEP 1 — Cultural Heritage Intelligence section.
 *
 * Replacement for Market Intelligence on cultural / heritage / non-
 * market objects. Renders only the rows where data is genuinely
 * present — missing fields are dropped (never "N/A"). When no rows
 * resolve, the entire section is suppressed instead of showing an
 * empty title block.
 *
 * Field sources:
 *   period               analysis.year
 *   region               analysis.collections[0].city
 *   material             analysis.works[0].medium
 *   purpose              (not in current schema — never rendered)
 *   historicalContext    analysis.description
 *   exhibitionInfo       analysis.exhibitions[0] joined
 *   originalLabel        (not in current schema — never rendered)
 */
export function CulturalHeritageIntelligence({ analysis }: Props) {
  const { t } = useLanguage();

  const rows: Row[] = [];

  if (analysis.year && analysis.year.trim()) {
    rows.push({ label: t("cultural.period"), value: analysis.year.trim() });
  }

  const firstColl = analysis.collections?.[0];
  if (firstColl?.city && firstColl.city.trim()) {
    rows.push({ label: t("cultural.region"), value: firstColl.city.trim() });
  }

  const firstWork = analysis.works?.[0];
  if (firstWork?.medium && firstWork.medium.trim()) {
    rows.push({ label: t("cultural.material"), value: firstWork.medium.trim() });
  }

  if (analysis.description && analysis.description.trim()) {
    rows.push({
      label: t("cultural.historical_context"),
      value: analysis.description.trim(),
    });
  }

  const firstEx = analysis.exhibitions?.[0];
  if (firstEx) {
    const exParts = [firstEx.title, firstEx.venue, firstEx.year]
      .filter((p): p is string => typeof p === "string" && p.trim() !== "");
    if (exParts.length > 0) {
      rows.push({
        label: t("cultural.exhibition_info"),
        value: exParts.join(" · "),
      });
    }
  }

  // Spec rule: hide rows with missing data; if everything is missing
  // suppress the whole section.
  if (rows.length === 0) return null;

  return (
    <div style={{
      paddingTop:    28,
      paddingBottom: 28,
      borderBottom:  "0.5px solid #F0F0F0",
    }}>
      <p style={{
        fontSize:       11,
        color:          "#8A6A3F",
        letterSpacing:  ".22em",
        textTransform:  "uppercase" as const,
        margin:         "0 0 18px",
        fontWeight:     600,
        fontFamily:     FONT,
      }}>
        ◆ {t("cultural.heritage_intelligence")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((row, i) => (
          <div key={i}>
            <p style={{
              fontSize:       9,
              color:          "#9A9A9A",
              letterSpacing:  ".18em",
              textTransform:  "uppercase" as const,
              margin:         "0 0 5px",
              fontWeight:     600,
              fontFamily:     FONT,
            }}>
              {row.label}
            </p>
            <p style={{
              fontSize:    13,
              color:       "#2A2A2A",
              lineHeight:  1.65,
              margin:      0,
              fontFamily:  FONT_HEAD,
              letterSpacing: "-.005em",
            }}>
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
