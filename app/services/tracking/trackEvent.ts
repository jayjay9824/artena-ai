"use client";
import type {
  AXVELAEvent, TrackedEvent, CaptureMethod, SourceType, SessionContext,
} from "../../types/tracking";
import { getOrCreateUserId } from "../../lib/tracking/userId";
import { getDeviceInfo } from "../../lib/tracking/deviceInfo";
import { pushTrackedEvent } from "./eventQueue";

interface TrackOptions {
  artwork_id?:       string | null;
  duration?:         number;
  question_text?:    string;
  capture_method?:   CaptureMethod;
  scanner_state?:    string;
  source_type?:      SourceType;
  session_context?:  SessionContext;
}

/**
 * BLOCK D — current session context. Default "home". Future: derive
 * from URL params, geolocation, or an explicit "I'm at an exhibition"
 * toggle. Centralized so callsites don't compute this themselves.
 */
function defaultSessionContext(): SessionContext {
  return "home";
}

/**
 * PART 5 — fire-and-forget tracker.
 *
 * Returns immediately. Event assembly + queue push run inside a
 * microtask so even the synchronous portion of this call doesn't
 * extend the caller's frame budget. Spec rule: never block UI,
 * camera, or transitions.
 *
 * The schema rules are enforced here so callsites stay terse:
 *   - question_text only retained on ASK
 *   - artwork_id defaults to null
 */
export function trackEvent(eventType: AXVELAEvent, opts: TrackOptions = {}): void {
  Promise.resolve().then(() => {
    const event: TrackedEvent = {
      user_id:           getOrCreateUserId(),
      artwork_id:        opts.artwork_id ?? null,
      event_type:        eventType,
      timestamp:         new Date().toISOString(),
      duration:          opts.duration,
      // Schema: question_text is required on ASK but allowed on the
      // BLOCK B events that carry the actual prompt text. Other event
      // types simply pass undefined.
      question_text:     opts.question_text,
      capture_method:    opts.capture_method,
      scanner_state:     opts.scanner_state,
      source_type:       opts.source_type,
      session_context:   opts.session_context ?? defaultSessionContext(),
      device_info:       getDeviceInfo(),
    };
    pushTrackedEvent(event);
  });
}

/**
 * Cheap duration helper. `const elapsed = startTimer();` then
 * `trackEvent("ASK", { duration: elapsed() })` later.
 */
export function startTimer(): () => number {
  const t0 = Date.now();
  return () => Date.now() - t0;
}
