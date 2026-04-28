/**
 * PART 5 — ARTENA tracking schema.
 *
 * Single source of truth for the events ARTENA collects. Adding a
 * new event means adding it here; the queue / API / consumers all
 * key off this union.
 *
 * Naming convention: SCREAMING_SNAKE per spec, distinct from the
 * lowercase scanner debug events (`logScannerEvent`) which serve a
 * different purpose (granular dev logs vs. business data asset).
 */

export type ARTENAEvent =
  | "SCAN_START"
  | "TARGET_DETECTED"
  | "TARGET_LOCKED"
  | "CAPTURE_AUTO"
  | "CAPTURE_FALLBACK"
  | "ANALYSIS_STARTED"
  | "ANALYSIS_COMPLETED"
  | "VIEW_RESULT"
  | "ASK"
  | "SAVE"
  /* BLOCK A — image upload inside the camera screen. Pipeline alias
     of CAPTURE_AUTO; emitted alongside it so analytics can split the
     two ingestion modes without losing the unified capture signal. */
  | "IMAGE_UPLOAD_STARTED"
  | "IMAGE_UPLOAD_COMPLETED"
  | "IMAGE_ANALYSIS_FAILED"
  | "IMAGE_ANALYSIS_RETRY"
  /* BLOCK B — Ask System edges. Every event carries artwork_id so
     intent analysis can roll questions up by canonical work. */
  | "ASK_OPEN"
  | "SUGGESTED_QUESTION_CLICKED"
  | "CUSTOM_QUESTION_SUBMITTED"
  | "FOLLOW_UP_ASK"
  | "ASK_RESPONSE_VIEWED"
  /* BLOCK D — Collection memory + history reveal. Distinguishes
     intentional revisit from impulse scan in the data layer. */
  | "COLLECTION_OPEN"
  | "COLLECTION_ITEM_OPEN"
  | "COLLECTION_REVISIT"
  | "HISTORY_VIEW_EXPANDED"
  | "HISTORY_SCROLL_DEPTH";

/** BLOCK D — where the artwork entered the pipeline. */
export type SourceType = "camera" | "upload" | "collection";

/**
 * BLOCK D — surface context.
 *
 *   exhibition  on-site flow (geo or explicit signal — TBD)
 *   home        default app session
 *   unknown     pre-resolution / SSR
 */
export type SessionContext = "exhibition" | "home" | "unknown";

export type CaptureMethod = "auto" | "fallback";

export interface DeviceInfo {
  platform:    string;
  user_agent:  string;
  language:    string;
  viewport:    { w: number; h: number };
  online:      boolean;
}

export interface TrackedEvent {
  user_id:           string;
  /** null until canonical matching identifies an artwork. */
  artwork_id:        string | null;
  event_type:        ARTENAEvent;
  /** ISO timestamp at the time the event was queued. */
  timestamp:         string;
  /** ms — populated where the schema rules call for it. */
  duration?:         number;
  /** Required only on ASK. */
  question_text?:    string;
  capture_method?:   CaptureMethod;
  /** ScannerState at event time — kept as string for forward-compat. */
  scanner_state?:    string;
  /** BLOCK D — pipeline entry point: camera / upload / collection. */
  source_type?:      SourceType;
  /** BLOCK D — surface context (default "home"). */
  session_context?:  SessionContext;
  device_info?:      DeviceInfo;
}
