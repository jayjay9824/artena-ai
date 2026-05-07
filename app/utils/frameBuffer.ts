/**
 * FrameBuffer — sliding window over recent FrameSnapshots with
 * stability + decay logic.
 *
 * Why this exists:
 *
 *   The detection pipeline emits a fresh FrameSnapshot per camera
 *   tick (10-30 Hz). Raw target classification flickers — a
 *   single noisy frame can momentarily flip primaryTarget from
 *   "artwork" to "qr" and back. Surfacing every flip directly to
 *   the UI causes label flashing, frame redraws, and false locks.
 *
 *   FrameBuffer absorbs that noise:
 *
 *     1. Stability — a target is "stable" only if it appears in
 *        ≥ stabilityThreshold (default 3) of the last maxSize
 *        (default 5) snapshots. A single rogue frame can't shift
 *        the perceived target.
 *
 *     2. Priority — when two targets are simultaneously stable
 *        (rare but possible), artwork wins, then label, then qr.
 *        Mirrors the global Camera Stability rule and Phase 2's
 *        resolvePrimaryTarget chain.
 *
 *     3. Decay — once a target locks, the buffer keeps reporting
 *        it for decayMs (default 500 ms) even after subsequent
 *        frames go noisy / empty. Prevents UI from flickering
 *        back to "idle" because the next frame happened to be
 *        between detections.
 *
 * Frame buffer NEVER stores imageBase64 (per global rule). The
 * push() entrypoint defensively rewrites incoming snapshots to a
 * known-good shape so a misbehaving producer can't leak image
 * bytes into the buffer through type-cast workarounds.
 */

import type { DetectionResult, DetectionTarget, FrameSnapshot } from "../types/scanner";

export class FrameBuffer {
  private readonly maxSize:            number;
  private readonly stabilityThreshold: number;
  private readonly decayMs:            number;

  private buffer: FrameSnapshot[] = [];

  /** Last target the buffer reported as stable. Persists past
   *  buffer changes so decay can refer to it. */
  private lastStableTarget: DetectionTarget = "none";
  /** ms timestamp of the last stable hit. Decay measures from here. */
  private lastStableAt:     number          = 0;

  constructor(
    maxSize:            number = 5,
    stabilityThreshold: number = 3,
    decayMs:            number = 500,
  ) {
    this.maxSize            = Math.max(1, maxSize);
    this.stabilityThreshold = Math.max(1, Math.min(stabilityThreshold, this.maxSize));
    this.decayMs            = Math.max(0, decayMs);
  }

  /**
   * Append a snapshot, evicting the oldest if the buffer is full.
   * The pushed object is reconstructed from the three known
   * FrameSnapshot fields, so any unexpected (or malicious) image
   * payload that snuck in through a type cast is dropped before
   * it can be retained.
   */
  push(snapshot: FrameSnapshot): void {
    const safe: FrameSnapshot = {
      detections:    Array.isArray(snapshot.detections) ? snapshot.detections : [],
      primaryTarget: snapshot.primaryTarget,
      capturedAt:    snapshot.capturedAt,
    };
    this.buffer.push(safe);
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Resolve the currently-stable target.
   *
   * Order (per spec):
   *   1. Count primaryTarget occurrences across all buffered
   *      frames (only "artwork" / "label" / "qr" — "none" is
   *      ignored).
   *   2. If artwork count ≥ threshold → stable artwork (mark +
   *      return).
   *   3. Else if label count ≥ threshold → stable label.
   *   4. Else if qr count ≥ threshold → stable qr.
   *   5. Else if a previous stable target exists AND we're still
   *      within decayMs of when it was stable → return the
   *      previous stable target ("hold" through brief noise).
   *   6. Else "none".
   *
   * Stability hits refresh `lastStableAt`, so a target that's
   * stable for many frames keeps the decay clock from running
   * down. The decay window only matters once the target stops
   * appearing.
   */
  getStableTarget(): DetectionTarget {
    let artwork = 0;
    let label   = 0;
    let qr      = 0;

    for (const frame of this.buffer) {
      if      (frame.primaryTarget === "artwork") artwork++;
      else if (frame.primaryTarget === "label")   label++;
      else if (frame.primaryTarget === "qr")      qr++;
    }

    if (artwork >= this.stabilityThreshold) return this.markStable("artwork");
    if (label   >= this.stabilityThreshold) return this.markStable("label");
    if (qr      >= this.stabilityThreshold) return this.markStable("qr");

    return this.decayedOrNone();
  }

  /**
   * Detections from the most recent frame — for rendering boxes.
   * Keeps the legacy "show every detection in the active area"
   * UX intact. Empty array when the buffer hasn't received a
   * frame yet.
   */
  getLatestDetections(): DetectionResult[] {
    if (this.buffer.length === 0) return [];
    return this.buffer[this.buffer.length - 1].detections;
  }

  /** Drop everything — wipe buffer + decay state. */
  clear(): void {
    this.buffer           = [];
    this.lastStableTarget = "none";
    this.lastStableAt     = 0;
  }

  /* ── Internals ───────────────────────────────────────────── */

  private markStable(target: DetectionTarget): DetectionTarget {
    this.lastStableTarget = target;
    this.lastStableAt     = Date.now();
    return target;
  }

  private decayedOrNone(): DetectionTarget {
    if (this.lastStableTarget === "none") return "none";
    if (Date.now() - this.lastStableAt >= this.decayMs) return "none";
    return this.lastStableTarget;
  }
}
