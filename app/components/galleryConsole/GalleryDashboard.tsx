"use client";
import React, { useMemo, useState } from "react";
import type { Artwork, GalleryId } from "../../lib/types";
import type { RangeKey } from "../../services/galleryConsole/galleryAnalyticsService";
import type { SortKey } from "../../services/galleryConsole/artworkPerformanceService";
import type { StrengthFilter } from "../../services/galleryConsole/leadSignalService";

import { useGalleryAnalytics } from "../../hooks/useGalleryAnalytics";
import { useArtworkPerformance } from "../../hooks/useArtworkPerformance";
import { useLeadSignals, useInterestedUsers } from "../../hooks/useLeadSignals";

import { GalleryMetricCards } from "./GalleryMetricCards";
import { GalleryFilters } from "./GalleryFilters";
import { ArtworkPerformanceTable } from "./ArtworkPerformanceTable";
import { LeadSignalsPanel } from "./LeadSignalsPanel";
import { InterestedUsersPanel } from "./InterestedUsersPanel";
import { ArtworkAnalyticsDetail } from "./ArtworkAnalyticsDetail";
import { ReportPreviewPanel } from "./ReportPreviewPanel";
import { AuditTrailCard } from "./AuditTrailCard";

interface DashboardProps {
  galleryId: GalleryId;
  galleryName: string;
}

export function GalleryDashboard({ galleryId, galleryName }: DashboardProps) {
  /* ── Shared filter state across panels ──────────────────────── */
  const [range, setRange]               = useState<RangeKey>("30d");
  const [artistId, setArtistId]         = useState<string | undefined>(undefined);
  const [availability, setAvailability] = useState<Artwork["availabilityStatus"] | undefined>(undefined);
  const [sort, setSort]                 = useState<SortKey>("leadScore");
  const [selectedArtworkId, setSelected] = useState<string | undefined>(undefined);
  const [leadStrength, setLeadStrength] = useState<StrengthFilter>("all");

  /* ── Data hooks ─────────────────────────────────────────────── */
  const dashboard = useGalleryAnalytics(galleryId, { range });
  const performance = useArtworkPerformance(galleryId, { range, artistId, availability, sort });
  const leads = useLeadSignals(galleryId, { strength: leadStrength === "all" ? undefined : leadStrength });
  const interested = useInterestedUsers(galleryId);

  // Keep dashboard + performance hooks aligned with the controlled filters.
  React.useEffect(() => { dashboard.setFilters(f => ({ ...f, range })); }, [range]);   // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    performance.setFilters(f => ({ ...f, range, artistId, availability, sort }));
  }, [range, artistId, availability, sort]);                                            // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    leads.setFilters(f => ({ ...f, strength: leadStrength === "all" ? undefined : leadStrength }));
  }, [leadStrength]);                                                                   // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRow = useMemo(
    () => performance.rows.find(r => r.artwork.id === selectedArtworkId) ?? null,
    [performance.rows, selectedArtworkId],
  );

  /* ── Layout ─────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8F7F4",
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "40px 28px 60px",
      }}>
        {/* Header */}
        <header style={{ marginBottom: 28 }}>
          <a
            href="/"
            style={{
              display: "inline-block",
              fontSize: 9, color: "#8A6A3F",
              letterSpacing: ".22em", textTransform: "uppercase",
              margin: "0 0 10px", textDecoration: "none",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}
          >
            AXVELA AI · Gallery Console
          </a>
          <h1 style={{
            fontSize: 28, fontWeight: 700, color: "#1C1A17",
            margin: "0 0 4px",
            fontFamily: "'KakaoBigSans', system-ui, sans-serif",
            letterSpacing: "-.025em", lineHeight: 1.05,
          }}>
            {galleryName}
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
            <p style={{
              fontSize: 13, color: "#6F6F6F", margin: 0,
              letterSpacing: ".005em",
            }}>
              Interest, intent, and lead signals from AXVELA collectors.
            </p>
            <a
              href="/console/bulk-upload"
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                background: "#FFFFFF",
                border: "0.5px solid #D9C9A6",
                borderRadius: 10,
                fontSize: 11, fontWeight: 600, color: "#8A6A3F",
                letterSpacing: ".04em", textDecoration: "none",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              }}
            >
              Bulk Upload →
            </a>
          </div>
        </header>

        {/* Metric cards */}
        <div style={{ marginBottom: 20 }}>
          <GalleryMetricCards metrics={dashboard.metrics} loading={dashboard.loading} />
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 20 }}>
          <GalleryFilters
            range={range}              onRange={setRange}
            artistId={artistId}        onArtist={setArtistId}
            availability={availability} onAvailability={setAvailability}
            sort={sort}                onSort={setSort}
          />
        </div>

        {/* Table + side detail */}
        <div style={{
          display: "grid",
          gridTemplateColumns: selectedRow ? "minmax(0, 1fr) 360px" : "1fr",
          gap: 16,
          marginBottom: 28,
          alignItems: "start",
        }}>
          <div>
            <h3 style={{
              fontSize: 14, fontWeight: 700, color: "#1C1A17",
              margin: "0 0 14px", letterSpacing: "-.005em",
              fontFamily: "'KakaoBigSans', system-ui, sans-serif",
            }}>
              Artwork Performance
            </h3>
            <ArtworkPerformanceTable
              rows={performance.rows}
              loading={performance.loading}
              onSelect={id => setSelected(id === selectedArtworkId ? undefined : id)}
              selectedId={selectedArtworkId}
            />
          </div>
          {selectedRow && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ArtworkAnalyticsDetail row={selectedRow} onClose={() => setSelected(undefined)} />
              <ReportPreviewPanel row={selectedRow} />
            </div>
          )}
        </div>

        {/* Lead Signals + Interested Users */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          gap: 24,
        }}>
          <LeadSignalsPanel
            leads={leads.leads} loading={leads.loading}
            strength={leadStrength} onStrength={setLeadStrength}
          />
          <InterestedUsersPanel users={interested.users} loading={interested.loading} />
        </div>

        {/* Audit Trail — append-only event log, hash-chained */}
        <div style={{ marginTop: 24 }}>
          <AuditTrailCard />
        </div>
      </div>
    </div>
  );
}
