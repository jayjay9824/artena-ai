"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { QuickReport, QRAnalysis } from "../../analyze/components/QuickReport";
import type { Report, SourceType } from "../../lib/types";

/* sourceType (Report) → QuickReport's narrower sourceType prop. */
function mapSource(t: SourceType): "image" | "camera" | "text" {
  if (t === "text")  return "text";
  if (t === "qr")    return "camera";
  if (t === "nfc")   return "camera";
  if (t === "axid")  return "camera";
  return "image";
}

interface Props {
  initialReport: Report;
}

export function SharedReportView({ initialReport }: Props) {
  const router = useRouter();
  const r = initialReport;

  return (
    <QuickReport
      analysis={r.analysisFull as QRAnalysis}
      imagePreview={r.representativeImageUrl ?? r.imageUrl ?? null}
      sourceType={mapSource(r.sourceType)}
      onReset={() => router.push("/")}
      // Read-only: no fresh market-intelligence call.
      onFullReport={() => {}}
      reportLoading={false}
      reportData={null}
      reportId={r.id}
    />
  );
}
