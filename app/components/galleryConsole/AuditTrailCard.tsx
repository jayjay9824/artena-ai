"use client";
import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, ScrollText } from "lucide-react";
import {
  getAuditEntries, verifyChain,
} from "../../services/auditService";
import type { AuditEntry, AuditAction } from "../../lib/types";

const ACTION_LABEL: Record<AuditAction, string> = {
  report_created:      "Report created",
  report_shared:       "Report shared",
  axid_scanned:        "AXID scanned",
  invoice_sent:        "Invoice sent",
  payment_marked_paid: "Payment marked paid",
  certificate_issued:  "Certificate issued",
  artwork_updated:     "Artwork updated",
};

function shortHash(h: string): string {
  if (!h) return "—";
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function AuditTrailCard() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [chain, setChain]     = useState<{ ok: boolean; brokenAt: number } | null>(null);

  useEffect(() => {
    const all = getAuditEntries();
    setEntries(all.slice(-5).reverse());  // newest first, last 5
    void verifyChain().then(setChain);
  }, []);

  if (!entries) return null;

  return (
    <section style={{
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 14,
      padding: "18px 20px 16px",
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <ScrollText size={14} strokeWidth={1.5} color="#8A6A3F" />
          <span style={{
            fontSize: 10, color: "#8A6A3F", letterSpacing: ".18em",
            textTransform: "uppercase", fontWeight: 600,
          }}>
            Audit Trail
          </span>
        </div>
        {chain && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 600,
            color:      chain.ok ? "#7C6A46" : "#A04848",
            background: chain.ok ? "#F4EFE5" : "#F7E9E2",
            padding: "3px 9px", borderRadius: 12,
          }}>
            {chain.ok
              ? <><ShieldCheck size={11} strokeWidth={1.6} /> Chain intact</>
              : <><AlertTriangle size={11} strokeWidth={1.6} /> Broken at #{chain.brokenAt}</>
            }
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p style={{ fontSize: 12, color: "#9A9A9A", margin: 0, lineHeight: 1.6 }}>
          Append-only event log. Entries appear here as reports are created, shared, AXIDs are scanned,
          and gallery state changes.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {entries.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 14,
                padding: "10px 0",
                borderTop: i === 0 ? "none" : "0.5px solid #F1ECE0",
                fontSize: 11.5,
                fontVariantNumeric: "tabular-nums",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#1C1A17" }}>
                  {ACTION_LABEL[e.action]}
                </p>
                <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#9A9A9A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.entityType} · {e.entityId}
                </p>
              </div>
              <code style={{
                color: "#8A6A3F", fontSize: 10,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }} title={e.hash}>
                {shortHash(e.hash)}
              </code>
              <span style={{ color: "#9A9A9A", fontSize: 10 }}>
                {relativeTime(e.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p style={{
        fontSize: 10, color: "#AAAAAA", margin: "12px 0 0", lineHeight: 1.55,
      }}>
        Append-only · SHA-256 hash-chained · LocalStorage in V1 ·
        Anchorable to a public ledger in production
      </p>
    </section>
  );
}
