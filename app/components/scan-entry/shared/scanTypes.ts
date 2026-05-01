/**
 * Scan-first UX — shared types.
 *
 * The "+" entry point in AXVELA AI is reinterpreted as the
 *   Physical Artwork → Data → Conversation
 * gateway. These types model that flow without any API or
 * persistence wiring yet.
 *
 * Mock-only contract:
 *   Any QuickInsight returned from a mock pipeline MUST carry
 *   isMock = true AND isVerified = false. Never display a
 *   "Verified" affordance for mock data.
 */

export type ScanEntryMode =
  | "idle"
  | "sheet"
  | "capturing"
  | "analyzing"
  | "result";

export type ScanSource = "camera" | "upload";

export type PhysicalStatus =
  | "tag_connected"
  | "unverified"
  | "lidar_scanned";

export type QuickInsight = {
  artist?:         string;
  title?:          string;
  year?:           string;
  medium?:         string;
  /** 0–100. Below 75 → low-confidence treatment, hide market/price prompts. */
  confidence?:     number;
  physicalStatus?: PhysicalStatus;
  isMock?:         boolean;
  isVerified?:     boolean;
};

export type ScannedArtwork = {
  imageDataUrl: string;
  source:       ScanSource;
  insight?:     QuickInsight;
  createdAt:    string;
};

/** Sheet rows — narrow union so callers can switch exhaustively. */
export type ScanSheetAction = "scan" | "upload" | "recent";

/** In-overlay scan timeline status. */
export type ScanResultStatus = "analyzing" | "ready" | "fallback";

/** Runtime scan record kept inside the overlay's state. */
export type ScanResult = {
  id:           string;
  imageDataUrl: string;
  source:       ScanSource;
  status:       ScanResultStatus;
  insight?:     QuickInsight;
  /** Optional graceful copy rendered alongside the card. Populated
   *  on the API failure path (timeout / network error / non-2xx)
   *  so the user knows the data is provisional. */
  message?:     string;
  createdAt:    string;
  ts:           number;
};

/**
 * Conservative mock insight per Step 5 spec. Always provisional —
 * isMock flips the UI into "Draft" treatment so the user never
 * reads it as confirmed data. Localized variant returned by
 * getConservativeMockInsight().
 */
export const MOCK_QUICK_INSIGHT: QuickInsight = {
  artist:         "Unknown artist",
  title:          "Artwork image",
  year:           "Analysis pending",
  medium:         "Image-based analysis",
  confidence:     62,
  physicalStatus: "unverified",
  isMock:         true,
  isVerified:     false,
};

/** Locale-aware mock so KO users don't see English placeholders. */
export function getConservativeMockInsight(lang: "ko" | "en"): QuickInsight {
  if (lang === "ko") {
    return {
      artist:         "작가 미상",
      title:          "작품 이미지",
      year:           "분석 대기 중",
      medium:         "이미지 기반 분석",
      confidence:     62,
      physicalStatus: "unverified",
      isMock:         true,
      isVerified:     false,
    };
  }
  return { ...MOCK_QUICK_INSIGHT };
}

/** Helper for callers that want a fresh ScannedArtwork stub. */
export function makeMockScannedArtwork(
  imageDataUrl: string,
  source: ScanSource,
  lang: "ko" | "en" = "en",
): ScannedArtwork {
  return {
    imageDataUrl,
    source,
    insight:   getConservativeMockInsight(lang),
    createdAt: new Date().toISOString(),
  };
}

/* Step 6 placeholder-detection sets — used by the overlay to
   decide whether market/price suggestions are allowed. */
export const PLACEHOLDER_ARTISTS = new Set(["Unknown artist", "작가 미상"]);
export const PLACEHOLDER_TITLES  = new Set(["Artwork image",  "작품 이미지"]);

export function isPlaceholderArtist(artist?: string) {
  return !artist || PLACEHOLDER_ARTISTS.has(artist);
}
export function isPlaceholderTitle(title?: string) {
  return !title || PLACEHOLDER_TITLES.has(title);
}
