/**
 * reportShareService — narrowly-scoped re-export of the share helpers.
 *
 * Kept as a separate module per spec so callers that only need share
 * URLs don't have to import the broader reportService (which also
 * exposes save/fetch). When share gets richer (per-channel deeplinks,
 * UTM tagging, etc.), additions go here without growing reportService.
 */

import { buildShareUrl } from "./reportService";

export { buildShareUrl };

/** Copy a URL to the clipboard. Returns true on success. */
export async function copyToClipboard(url: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Whether the platform supports the native Web Share sheet. */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * STEP 5 — URL of the 1080x1920 share card PNG. Use this as the
 * og:image / twitter:image on the public viewer page so social
 * platforms get a frozen preview that matches the in-app card.
 */
export function buildShareCardUrl(reportId: string): string {
  const path = `/api/reports/${encodeURIComponent(reportId)}/share-card`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export type ShareResult = "shared" | "copied" | "failed";

/**
 * STEP 5 — Trigger native share sheet, falling back to clipboard.
 *
 * The card image lives at /api/reports/{id}/share-card; consuming
 * apps (Instagram Stories, KakaoTalk, X) fetch it via OG metadata
 * when they crawl the shared link.
 */
export async function shareReport(
  reportId: string,
  opts?: { title?: string; text?: string },
): Promise<ShareResult> {
  const url = buildShareUrl(reportId);

  if (canNativeShare()) {
    try {
      await navigator.share({ title: opts?.title, text: opts?.text, url });
      return "shared";
    } catch (err) {
      // User dismissed the share sheet — leave them on the report page.
      if ((err as Error).name === "AbortError") return "failed";
      // Other errors fall through to the clipboard fallback.
    }
  }

  if (await copyToClipboard(url)) return "copied";
  return "failed";
}
