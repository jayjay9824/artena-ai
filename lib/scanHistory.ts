/**
 * Scan history — persistent collection of scanned artworks.
 *
 * Current backend: localStorage (single-key JSON array, newest-first, capped).
 * Future backends: IndexedDB / remote DB / authenticated cloud sync.
 * Callers should depend ONLY on the exported function surface so that
 * the implementation can be swapped without UI changes.
 */

import type { ArtworkReport } from './types';
import { resizeDataUrl } from './image';

const STORAGE_KEY = 'axvela_scan_history';
const MAX_ITEMS = 30;

export type ScanHistoryItem = {
  id: string;
  imageDataUrl: string;
  artist?: string;
  title?: string;
  year?: string;
  confidence: number;
  createdAt: string;
  /** Full Claude report for in-place re-display without a re-scan. */
  insight: ArtworkReport;
};

/* ─── Internal storage helpers ─── */

function safeRead(): ScanHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScanHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(items: ScanHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or storage blocked — drop silently.
    // History is best-effort; scanning still works.
  }
}

function generateId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ─── Public API ─── */

export function getAllScans(): ScanHistoryItem[] {
  return safeRead();
}

export function getScanById(id: string): ScanHistoryItem | null {
  return safeRead().find((i) => i.id === id) ?? null;
}

export function addScan(
  input: Omit<ScanHistoryItem, 'id' | 'createdAt'>,
): ScanHistoryItem {
  const item: ScanHistoryItem = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const current = safeRead();
  // newest first, dedupe by id (defensive — id is unique by construction)
  const next = [item, ...current.filter((i) => i.id !== item.id)].slice(
    0,
    MAX_ITEMS,
  );
  safeWrite(next);
  return item;
}

export function clearScans(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Save a finalized scan to history. Resizes the image to a thumbnail first
 * to keep localStorage usage bounded. Returns null on any failure — never
 * throws (history is best-effort).
 */
export async function saveScan(
  originalDataUrl: string,
  report: ArtworkReport,
): Promise<ScanHistoryItem | null> {
  try {
    const thumb = await resizeDataUrl(originalDataUrl);
    return addScan({
      imageDataUrl: thumb,
      artist: report.artist,
      title: report.title,
      year: report.year,
      confidence: report.confidence,
      insight: report,
    });
  } catch {
    return null;
  }
}
