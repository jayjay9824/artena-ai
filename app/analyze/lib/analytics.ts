/**
 * ARTENA Data Flywheel
 *
 * One trackEvent() entrypoint feeds the local event queue and (eventually)
 * a backend ingest endpoint. Intent detection runs synchronously when an
 * ai_question event fires — purchase-intent questions emit a second
 * intent_signal event tagged with the matched signal.
 *
 * Why this matters: scan + like + save data is interesting, but the
 * differentiator is real-time purchase-intent detection from chat. A user
 * asking "가격은 적정한가요?" right after scanning a $50K artwork is a
 * lead — we want that captured in a clean shape from day one.
 */

export type ScanSource = "qr" | "artwork" | "label" | "upload" | "text";

export type IntentSignal =
  | "price_evaluation"
  | "purchase_consideration"
  | "ownership_inquiry"
  | "investment_outlook";

export type EventType =
  // Acquisition
  | "scan_started"
  | "scan_succeeded"
  | "scan_failed"
  // Engagement
  | "artwork_liked"
  | "artwork_unliked"
  | "artwork_saved"
  | "artwork_unsaved"
  | "artwork_added_to_collection"
  | "view_collection_clicked"
  // Conversation
  | "ask_artena_clicked"
  | "ai_question_asked"
  | "ai_suggested_chip_used"
  // Intent (high-value)
  | "intent_signal";

export interface TrackEventPayload {
  /** Stable artwork identifier — usually `${title}|${artist}|${year}` hash */
  artworkId?: string;
  /** Free-form attributes; keep keys consistent across calls */
  [key: string]: string | number | boolean | null | undefined;
}

export interface TrackedEvent {
  event: EventType;
  ts: string;
  payload: TrackEventPayload;
}

const STORAGE_KEY = "artena.events";
const MAX_BUFFERED = 500;

/* ── Intent detection ───────────────────────────────────────────────── */

interface IntentRule {
  signal: IntentSignal;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  {
    signal: "price_evaluation",
    patterns: [
      /가격.*적정/,
      /얼마.*가치/,
      /가격이?\s*맞/,
      /price.*(fair|right|appropriate)/i,
      /worth.*price/i,
    ],
  },
  {
    signal: "purchase_consideration",
    patterns: [
      /구매할\s*가치/,
      /살\s*만한/,
      /살까/,
      /구입/,
      /worth\s+buying/i,
      /should\s+i\s+(buy|purchase)/i,
    ],
  },
  {
    signal: "ownership_inquiry",
    patterns: [
      /어디서\s*살\s*수/,
      /어디서\s*구할/,
      /구입\s*방법/,
      /where.*buy/i,
      /how.*acquire/i,
    ],
  },
  {
    signal: "investment_outlook",
    patterns: [
      /투자.*가치/,
      /오를?\s*것/,
      /상승/,
      /수익/,
      /investment/i,
      /price.*(rise|appreciate)/i,
    ],
  },
];

export function detectIntent(text: string): IntentSignal | null {
  const t = text.trim();
  if (!t) return null;
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some(p => p.test(t))) return rule.signal;
  }
  return null;
}

/* ── Persistence ────────────────────────────────────────────────────── */

function readQueue(): TrackedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(events: TrackedEvent[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = events.length > MAX_BUFFERED ? events.slice(-MAX_BUFFERED) : events;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage quota / disabled — silently drop
  }
}

/* ── Public API ─────────────────────────────────────────────────────── */

export function trackEvent(event: EventType, payload: TrackEventPayload = {}) {
  const record: TrackedEvent = {
    event,
    ts: new Date().toISOString(),
    payload,
  };

  if (typeof window !== "undefined") {
    const queue = readQueue();
    queue.push(record);
    writeQueue(queue);
  }

  // Always log in dev for visibility.
  if (typeof console !== "undefined") {
    console.log("[ARTENA]", record);
  }

  // Auto-emit intent_signal when an ai_question carries purchase intent.
  if (event === "ai_question_asked" && typeof payload.text === "string") {
    const signal = detectIntent(payload.text);
    if (signal) {
      trackEvent("intent_signal", {
        artworkId: payload.artworkId,
        signal,
        sourceText: payload.text,
        sourceEvent: "ai_question_asked",
      });
    }
  }
}

export function getEventQueue(): TrackedEvent[] {
  return readQueue();
}

export function clearEventQueue() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/* ── Identity helper ────────────────────────────────────────────────── */

export function makeArtworkId(parts: { title?: string; artist?: string; year?: string }): string {
  const t = (parts.title  ?? "untitled").trim();
  const a = (parts.artist ?? "unknown").trim();
  const y = (parts.year   ?? "n.d.").trim();
  return `${t}|${a}|${y}`.toLowerCase().replace(/\s+/g, "_");
}
