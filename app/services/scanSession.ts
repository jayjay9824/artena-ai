/**
 * ScanSessionManager — multi-scan context for the camera flow.
 *
 * A session bundles up to 5 sequential scans (artwork → label →
 * qr in any order) so the analyze pipeline can fuse them into a
 * richer context: the artwork scan carries the visual, the label
 * scan adds OCR-extracted metadata, the QR scan attaches
 * structured data.
 *
 * Lifecycle:
 *
 *   active     created on first scan, refreshed on each addScan.
 *   expired    auto-transitioned by isActive() once 60 s of
 *              inactivity OR 5 min total duration elapses.
 *              Subsequent getOrCreateSession() spawns a fresh one.
 *   completed  caller-set when the user finishes the flow.
 *   cancelled  caller-set when the user backs out.
 *
 * Rules (per Phase 4 spec):
 *   - sessionId always present.
 *   - scan sequence always present (1-indexed).
 *   - 60 s inactivity timeout.
 *   - 5 min max session duration.
 *   - Max 5 scans per session — extra calls return null.
 *   - Expired sessions never reused; replaced on next request.
 *   - imageBase64 stored ONLY on locked SessionScans, never on
 *     frame-buffer entries (the frame buffer in Phase 3 already
 *     enforces this on its end).
 *
 * Intended for client-side use (React context or hook). The class
 * uses no Node-specific APIs, so it ports server-side too if
 * needed (e.g. for an Edge worker session store).
 */

import type {
  DetectionResult,
  DetectionTarget,
  ScanSession,
  SessionScan,
} from "../types/scanner";

/* ── Constants ─────────────────────────────────────────────── */

const INACTIVITY_TIMEOUT_MS   = 60_000;     // 60 s
const MAX_SESSION_DURATION_MS = 300_000;    // 5 min
const MAX_SCANS_PER_SESSION   = 5;

/* ── Public types ──────────────────────────────────────────── */

export interface AddScanInput {
  primaryTarget: DetectionTarget;
  detections:    DetectionResult[];
  /** The captured frame at lock time. Optional so callers that
   *  haven't completed capture (e.g. partial flow) can still log
   *  the detection for later merging. */
  imageBase64?:  string;
}

export interface MergedScanContext {
  sessionId:    string;
  /** Most recent artwork scan in the session, if any. */
  artworkScan?: SessionScan;
  /** Most recent label scan, if any. */
  labelScan?:   SessionScan;
  /** Most recent QR scan, if any. */
  qrScan?:      SessionScan;
  /** Total scans recorded — sum of all targets, capped at 5. */
  totalScans:   number;
}

/* ── Manager ───────────────────────────────────────────────── */

export class ScanSessionManager {
  private current: ScanSession | null = null;

  /**
   * Returns the active session, creating a fresh one if none
   * exists or the previous one expired. The returned session is
   * always status === "active" — callers can use it directly
   * without further status checks.
   */
  getOrCreateSession(): ScanSession {
    const now = Date.now();

    if (this.current && this.isActive(this.current, now)) {
      return this.current;
    }

    // The previous session, if any, is no longer reusable.
    // Mark it expired (if it wasn't already finalized) so the
    // status field reflects reality before we drop the reference.
    if (this.current && this.current.status === "active") {
      this.current.status = "expired";
    }

    this.current = {
      sessionId:      makeId(),
      startedAt:      now,
      lastActivityAt: now,
      scans:          [],
      status:         "active",
    };
    return this.current;
  }

  /**
   * Append a locked scan to the current session. Returns the
   * recorded SessionScan, or null when the per-session cap of 5
   * scans is hit (caller should surface a "session full" hint /
   * complete the session).
   */
  addScan(input: AddScanInput): SessionScan | null {
    const session = this.getOrCreateSession();
    if (session.scans.length >= MAX_SCANS_PER_SESSION) return null;

    const now = Date.now();
    const scan: SessionScan = {
      scanId:        makeId(),
      sequence:      session.scans.length + 1,
      primaryTarget: input.primaryTarget,
      detections:    Array.isArray(input.detections) ? input.detections : [],
      // Only persist imageBase64 if the caller actually supplied
      // one. We never fabricate or copy from elsewhere.
      imageBase64:   input.imageBase64,
      capturedAt:    now,
    };

    session.scans.push(scan);
    session.lastActivityAt = now;
    return scan;
  }

  /**
   * Read-only merged view across the current session. Returns the
   * MOST RECENT scan for each target type — if the user scanned
   * the artwork twice, only the second is exposed as
   * `artworkScan`. Read-only call, does not refresh the
   * inactivity timer.
   */
  getMergedContext(): MergedScanContext | null {
    if (!this.current) return null;
    const session = this.current;

    let artworkScan: SessionScan | undefined;
    let labelScan:   SessionScan | undefined;
    let qrScan:      SessionScan | undefined;

    for (const scan of session.scans) {
      if      (scan.primaryTarget === "artwork") artworkScan = scan;
      else if (scan.primaryTarget === "label")   labelScan   = scan;
      else if (scan.primaryTarget === "qr")      qrScan      = scan;
    }

    return {
      sessionId:  session.sessionId,
      artworkScan,
      labelScan,
      qrScan,
      totalScans: session.scans.length,
    };
  }

  /** Mark the active session as completed. No-op if there's no
   *  active session. */
  completeSession(): void {
    if (this.current?.status === "active") {
      this.current.status = "completed";
    }
  }

  /** Mark the active session as cancelled. No-op if there's no
   *  active session. */
  cancelSession(): void {
    if (this.current?.status === "active") {
      this.current.status = "cancelled";
    }
  }

  /**
   * Drop the current session if it has expired by either timeout.
   * Safe to call periodically (e.g. on component unmount or a
   * useEffect cleanup) without checking state first.
   */
  cleanupExpiredSession(): void {
    if (!this.current) return;
    if (this.isActive(this.current, Date.now())) return;

    if (this.current.status === "active") {
      this.current.status = "expired";
    }
    this.current = null;
  }

  /* ── Internals ───────────────────────────────────────────── */

  /** True when the session is still usable — active status AND
   *  within both timeouts. */
  private isActive(session: ScanSession, now: number): boolean {
    if (session.status !== "active") return false;
    if (now - session.lastActivityAt > INACTIVITY_TIMEOUT_MS) return false;
    if (now - session.startedAt      > MAX_SESSION_DURATION_MS) return false;
    return true;
  }
}

/* ── Helpers ────────────────────────────────────────────────── */

function makeId(): string {
  // Short, sortable-ish, collision-resistant for session-scoped
  // use. Not cryptographically random — sessionIds aren't
  // security tokens, just per-flow handles.
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${t}-${r}`;
}
