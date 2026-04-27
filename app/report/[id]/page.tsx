"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuickReport, QRAnalysis } from "../../analyze/components/QuickReport";
import { fetchReport } from "../../services/reportService";
import type { Report, SourceType } from "../../lib/types";

/* sourceType (Report) → QuickReport's sourceType prop. */
function mapSource(t: SourceType): "image" | "camera" | "text" {
  if (t === "text")  return "text";
  if (t === "qr")    return "camera";
  return "image";
}

export default function SharedReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; report: Report }
    | { kind: "missing" }
  >({ kind: "loading" });

  useEffect(() => {
    if (!params.id) return;
    fetchReport(params.id).then(report => {
      if (!report) setState({ kind: "missing" });
      else         setState({ kind: "ok", report });
    });
  }, [params.id]);

  /* ── Loading ──────────────────────────────────────────────────── */
  if (state.kind === "loading") {
    return (
      <div style={{
        minHeight: "100vh", background: "#F8F7F4",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 36, height: 36,
            border: "2.5px solid #EBE6DB",
            borderTop: "2.5px solid #8A6A3F",
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
            margin: "0 auto 14px",
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 12, color: "#8A6A3F", letterSpacing: ".06em" }}>
            공유된 분석 불러오는 중
          </p>
        </div>
      </div>
    );
  }

  /* ── Missing ──────────────────────────────────────────────────── */
  if (state.kind === "missing") {
    return (
      <div style={{
        minHeight: "100vh", background: "#F8F7F4",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 28px", textAlign: "center" as const,
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        <div>
          <p style={{
            fontSize: 11, color: "#8A6A3F", letterSpacing: ".18em",
            textTransform: "uppercase" as const, marginBottom: 14,
          }}>
            ARTENA · Cultural Intelligence
          </p>
          <h1 style={{
            fontSize: 18, fontWeight: 600, color: "#111",
            margin: "0 0 8px", letterSpacing: "-.01em",
          }}>
            분석 결과를 찾을 수 없습니다
          </h1>
          <p style={{
            fontSize: 13, color: "#6F6F6F", lineHeight: 1.6,
            margin: "0 0 28px",
          }}>
            링크가 만료되었거나 분석이 삭제되었을 수 있습니다.
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "12px 28px",
              background: "#8A6A3F", color: "#fff",
              border: "none", borderRadius: 12,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              letterSpacing: ".04em",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  /* ── Render shared report (read-only QuickReport) ─────────────── */
  const r = state.report;
  return (
    <QuickReport
      analysis={r.analysisFull as QRAnalysis}
      imagePreview={r.imageUrl ?? null}
      sourceType={mapSource(r.sourceType)}
      onReset={() => router.push("/")}
      // No fresh market-intelligence call on shared view — too expensive
      // and shared-link viewers shouldn't be billed for the original
      // user's analysis depth. Hide the CTA by passing a no-op.
      onFullReport={() => {}}
      reportLoading={false}
      reportData={null}
    />
  );
}
