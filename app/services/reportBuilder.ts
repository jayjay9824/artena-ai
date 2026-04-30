/**
 * QuickReportPayload builder — fuses a multi-scan session into a
 * single object the QuickReport surface can render.
 *
 * Inputs:
 *   - MergedScanContext from ScanSessionManager (Phase 4)
 *   - artworkConfidence from the AI analyze pass (Hybrid router)
 *
 * Outputs the V1 payload shape:
 *
 *   sessionId / scanSequence       lifecycle handle
 *   primarySource                   which target drives the report
 *                                   (artwork > label > qr per the
 *                                   global priority rule)
 *   artworkImage                    base64 from the locked artwork
 *                                   scan, if any
 *   labelText / labelOcrConfidence  OCR fields from the label scan
 *   qrPayload / qrType / qrIsSafe   QR fields with safety verdict
 *   confidence                      overall — driven by artwork
 *                                   confidence when present
 *   supportingSources               every other source contributing
 *   actionRequired                  the next-step hint surfaced
 *                                   to the user (security gates
 *                                   precede correction prompts)
 *   warnings                        non-blocking quality flags
 *
 * actionRequired priority (security first):
 *
 *   1. Unsafe QR present (external_url / unknown) → review_external_qr
 *   2. No useful source                            → manual_search_recommended
 *   3. Label only, no artwork                      → scan_artwork_recommended
 *   4. Artwork low conf (< 75) + no label          → scan_label_recommended
 *   5. Otherwise                                   → none
 *
 * Pure function — no I/O, no React, no AI calls.
 */

import type {
  DetectionTarget,
  QRType,
  SessionScan,
} from "../types/scanner";
import type { MergedScanContext } from "./scanSession";
import { isQRSafe } from "../utils/qrClassifier";

/* ── Types ──────────────────────────────────────────────────── */

export type ActionRequired =
  | "scan_label_recommended"
  | "scan_artwork_recommended"
  | "review_external_qr"
  | "manual_search_recommended"
  | "none";

export interface QuickReportPayload {
  sessionId:           string;
  scanSequence:        number;
  primarySource:       DetectionTarget;
  artworkImage?:       string;
  labelText?:          string;
  labelOcrConfidence?: number;
  qrPayload?:          string;
  qrType?:             QRType;
  qrIsSafe?:           boolean;
  /** 0-100 overall confidence — when artwork is present, this is
   *  the AI's recognitionConfidence; otherwise 0. */
  confidence:          number;
  supportingSources:   DetectionTarget[];
  actionRequired:      ActionRequired;
  warnings:            string[];
}

export interface BuildQuickReportOptions {
  /** Sequential scan number within the session. Phase 4's
   *  SessionScan.sequence (1-indexed). */
  scanSequence:        number;
  /** Recognition confidence from the AI analyze pass (Claude /
   *  Gemini hybrid). 0-100. Required when an artworkScan exists;
   *  defaults to 0 otherwise. */
  artworkConfidence?:  number;
}

/* ── Builder ────────────────────────────────────────────────── */

export function buildQuickReportPayload(
  context: MergedScanContext,
  options: BuildQuickReportOptions,
): QuickReportPayload {
  const { scanSequence, artworkConfidence = 0 } = options;

  const hasArtwork = !!context.artworkScan;
  const hasLabel   = !!context.labelScan;
  const hasQR      = !!context.qrScan;

  /* Primary source per the global priority artwork → label → qr.
   * If nothing scanned, it stays "none" so callers can branch
   * on that early. */
  const primarySource: DetectionTarget =
    hasArtwork ? "artwork" :
    hasLabel   ? "label"   :
    hasQR      ? "qr"      :
                 "none";

  /* Every present source that ISN'T the primary — order
   * preserved per priority for stable rendering. */
  const supportingSources: DetectionTarget[] = [];
  if (hasArtwork && primarySource !== "artwork") supportingSources.push("artwork");
  if (hasLabel   && primarySource !== "label")   supportingSources.push("label");
  if (hasQR      && primarySource !== "qr")      supportingSources.push("qr");

  /* Pull metadata out of the session scans. SessionScan carries
   * imageBase64 only on the artwork scan (Phase 1 + Phase 4
   * contract); label / QR detections expose their text via
   * DetectionResult.data + ocrConfidence. */
  const artworkImage      = context.artworkScan?.imageBase64;

  const labelDet          = pickDetection(context.labelScan, "label");
  const labelText         = labelDet?.data;
  const labelOcrConfidence = labelDet?.ocrConfidence;

  const qrDet             = pickDetection(context.qrScan, "qr");
  const qrPayload         = qrDet?.data;
  const qrType            = qrDet?.qrType;
  const qrIsSafe          = qrType !== undefined && qrPayload !== undefined
    ? isQRSafe(qrPayload, qrType)
    : undefined;

  /* Warnings — non-blocking quality flags. The scanner UI can
   * surface these as inline notes ("OCR may be incomplete"). */
  const warnings: string[] = [];
  if (typeof labelOcrConfidence === "number" && labelOcrConfidence < 60) {
    warnings.push("low_label_ocr_confidence");
  }

  /* actionRequired — security gates precede correction prompts. */
  let actionRequired: ActionRequired;

  // 1. Unsafe QR ALWAYS wins, even if other useful data exists.
  //    The user must explicitly review the external link before
  //    we can proceed without auto-trusting it.
  if (qrType !== undefined && qrPayload !== undefined && !isQRSafe(qrPayload, qrType)) {
    actionRequired = "review_external_qr";
  }
  // A "useful source" is anything we can actually analyze on:
  // an artwork image, an OCR'd label, or a SAFE QR.
  else if (!hasArtwork && !hasLabel && !(hasQR && qrIsSafe)) {
    actionRequired = "manual_search_recommended";
  }
  else if (hasLabel && !hasArtwork) {
    actionRequired = "scan_artwork_recommended";
  }
  else if (hasArtwork && artworkConfidence < 75 && !hasLabel) {
    actionRequired = "scan_label_recommended";
  }
  else {
    actionRequired = "none";
  }

  return {
    sessionId:           context.sessionId,
    scanSequence,
    primarySource,
    artworkImage,
    labelText,
    labelOcrConfidence,
    qrPayload,
    qrType,
    qrIsSafe,
    confidence:          hasArtwork ? clampConf(artworkConfidence) : 0,
    supportingSources,
    actionRequired,
    warnings,
  };
}

/* ── Internals ──────────────────────────────────────────────── */

function pickDetection(scan: SessionScan | undefined, target: DetectionTarget) {
  if (!scan) return undefined;
  // Pick the detection inside the scan whose target matches the
  // scan's primary target — this is the one the scanner locked
  // on (vs. supporting boxes also visible in the same frame).
  return scan.detections.find(d => d.target === target);
}

function clampConf(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}
