/**
 * reportShareService — narrowly-scoped re-export of the share helpers.
 *
 * Kept as a separate module per spec so callers that only need share
 * URLs don't have to import the broader reportService (which also
 * exposes save/fetch). When share gets richer (per-channel deeplinks,
 * UTM tagging, etc.), additions go here without growing reportService.
 */

export { buildShareUrl } from "./reportService";

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
