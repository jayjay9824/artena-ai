/**
 * PART 5 — fire-and-forget event queue.
 *
 *   push(event)      synchronous — buffer in memory and schedule a flush
 *   flush()          ship the current batch to /api/events
 *
 * Flush triggers:
 *   • size threshold (≥ FLUSH_BATCH_THRESHOLD events buffered)
 *   • idle timer    (every FLUSH_INTERVAL_MS while non-empty)
 *   • visibilitychange (document hidden) + pagehide — uses sendBeacon
 *     so events still ship when the tab is closing.
 *
 * Spec rules enforced:
 *   - Never blocks UI: push is sync + synchronous-only buffering.
 *   - Background queue: real network only fires inside flush().
 *   - On failure, the batch is requeued for the next cycle.
 */

import type { TrackedEvent } from "../../types/tracking";

const FLUSH_INTERVAL_MS     = 5000;
const FLUSH_BATCH_THRESHOLD = 20;
const ENDPOINT              = "/api/events";

class EventQueue {
  private buffer: TrackedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  push(event: TrackedEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= FLUSH_BATCH_THRESHOLD) {
      void this.flush();
      return;
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer != null) return;
    this.flushTimer = setTimeout(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  async flush(): Promise<void> {
    if (this.flushTimer != null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);

    if (typeof window === "undefined") return;
    const body = JSON.stringify({ events: batch });

    try {
      // sendBeacon is the right tool for unload — it fires under
      // visibilitychange / pagehide where keepalive fetches sometimes
      // get dropped by browsers.
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        const ok = navigator.sendBeacon(ENDPOINT, blob);
        if (ok) return;
      }
      await fetch(ENDPOINT, {
        method:    "POST",
        headers:   { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    } catch {
      // Re-queue so the next flush retries. Insert at the front so
      // chronological order is preserved.
      this.buffer.unshift(...batch);
    }
  }
}

const queue = new EventQueue();

export function pushTrackedEvent(event: TrackedEvent): void {
  queue.push(event);
}

export function flushTrackedEvents(): Promise<void> {
  return queue.flush();
}

/* Auto-flush on visibility change + page hide (browser-only). */
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void queue.flush();
  });
  window.addEventListener("pagehide", () => {
    void queue.flush();
  });
}
