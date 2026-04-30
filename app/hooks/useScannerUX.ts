"use client";

/**
 * Scanner UX copy — primary / secondary feedback per state.
 *
 * Two exports:
 *
 *   getScannerFeedback(state, language)
 *     Pure function. Server- and client-safe. Use when you have
 *     a language string in hand (e.g. inside a server component
 *     or a context-free utility).
 *
 *   useScannerUX(state)
 *     React hook. Reads the active language from useLanguage()
 *     and resolves the feedback for the given state. The
 *     scanner UI uses this so language toggles propagate without
 *     any extra wiring at the call site.
 *
 * Voice rules (per spec):
 *   - Artwork-first framing — idle / detecting / failed copy
 *     gently steers the user toward showing the artwork
 *     directly, with label as a secondary path.
 *   - QR is described as "supporting data", never as the primary
 *     identification channel.
 *   - No "Loading", "Server processing", "Waiting", "Please wait"
 *     phrasing — replaced with active verbs (Reading / Analyzing /
 *     Connecting / Composing).
 */

import type { ScannerState } from "../types/scanner";
import { useLanguage } from "../i18n/useLanguage";

export interface ScannerFeedback {
  primary:   string;
  secondary: string;
}

const KO_FEEDBACK: Record<ScannerState, ScannerFeedback> = {
  idle: {
    primary:   "작품을 비춰주세요",
    secondary: "작품 또는 라벨을 화면 중앙에 맞춰주세요",
  },
  detecting: {
    primary:   "인식 중...",
    secondary: "잠시 그대로 유지해주세요",
  },
  artwork_detected: {
    primary:   "작품 감지됨",
    secondary: "이미지와 스타일을 분석합니다",
  },
  label_detected: {
    primary:   "라벨 감지됨",
    secondary: "작가, 제목, 연도, 매체를 읽고 있습니다",
  },
  qr_detected: {
    primary:   "QR 감지됨",
    secondary: "보조 데이터로 활용합니다",
  },
  qr_action_required: {
    primary:   "QR이 인식되었습니다",
    secondary: "더 정확한 분석을 위해 작품이나 라벨을 스캔해주세요",
  },
  // Legacy state — same visual treatment as `detecting`.
  locking: {
    primary:   "인식 중...",
    secondary: "잠시 그대로 유지해주세요",
  },
  analyzing: {
    primary:   "분석 중",
    secondary: "작품, 라벨, QR, 시장 데이터를 연결합니다",
  },
  success: {
    primary:   "스캔 완료",
    secondary: "결과를 준비하고 있습니다",
  },
  failed: {
    primary:   "작품을 인식하지 못했습니다",
    secondary: "작품 사진, 라벨 스캔, 또는 수동 검색을 시도해주세요",
  },
  permission_denied: {
    primary:   "카메라 권한이 필요합니다",
    secondary: "설정에서 카메라 접근을 허용하거나 갤러리에서 사진을 선택해주세요",
  },
  cancelled: {
    primary:   "스캔 취소됨",
    secondary: "다시 시도하려면 화면을 탭하세요",
  },
};

const EN_FEEDBACK: Record<ScannerState, ScannerFeedback> = {
  idle: {
    primary:   "Point at the artwork",
    secondary: "Center the artwork or label in the frame",
  },
  detecting: {
    primary:   "Reading...",
    secondary: "Hold steady",
  },
  artwork_detected: {
    primary:   "Artwork detected",
    secondary: "Analyzing image and style",
  },
  label_detected: {
    primary:   "Label detected",
    secondary: "Reading artist, title, year, and medium",
  },
  qr_detected: {
    primary:   "QR detected",
    secondary: "Using as supporting data",
  },
  qr_action_required: {
    primary:   "QR captured",
    secondary: "For more accurate results, scan the artwork or its label",
  },
  // Legacy state — same visual treatment as `detecting`.
  locking: {
    primary:   "Reading...",
    secondary: "Hold steady",
  },
  analyzing: {
    primary:   "Analyzing",
    secondary: "Connecting artwork, label, QR, and market data",
  },
  success: {
    primary:   "Scan complete",
    secondary: "Composing your result",
  },
  failed: {
    primary:   "Couldn't recognize the artwork",
    secondary: "Try the artwork directly, scan the label, or search by name",
  },
  permission_denied: {
    primary:   "Camera access required",
    secondary: "Allow camera in Settings or pick a photo from your gallery",
  },
  cancelled: {
    primary:   "Scan cancelled",
    secondary: "Tap to start again",
  },
};

/* ── Public API ─────────────────────────────────────────────── */

/**
 * Pure function — given a scanner state and a language code,
 * return the primary / secondary feedback strings.
 *
 * Falls back to `idle` copy for any unrecognized state value
 * (defensive — keeps the UI from showing empty text if a future
 * state lands without copy).
 */
export function getScannerFeedback(
  state:    ScannerState,
  language: "ko" | "en",
): ScannerFeedback {
  const map = language === "ko" ? KO_FEEDBACK : EN_FEEDBACK;
  return map[state] ?? map.idle;
}

/**
 * React hook — auto-binds to the active app language so
 * components don't have to thread `lang` through props.
 */
export function useScannerUX(state: ScannerState): ScannerFeedback {
  const { lang } = useLanguage();
  return getScannerFeedback(state, lang);
}
