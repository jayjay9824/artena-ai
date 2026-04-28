"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Report, ReportStatus } from "../../lib/types";

/**
 * STEP 2 — Background report orchestration on the client.
 *
 *   start(input)  POST /api/reports/generate, then poll
 *                 GET /api/reports/{id} until status:"ready" / "error".
 *   stop()        Cancel any in-flight polling.
 *
 * Cache hit (status:"ready") returns immediately — no polling. Stale
 * caches return ready with the existing record while the server warms
 * fresh market data; the hook re-fetches once so the polled `report`
 * picks up the patched snapshot.
 *
 * Spec rule "do not block UI": every state transition is async; the
 * Quick View parent screen never waits on this hook.
 */

interface GenerateInput {
  /* Identity */
  artworkId?:        string;
  axid?:             string;
  galleryId?:        string;

  /* Source inputs */
  imageURI?:         string;
  extractedText?:    string;
  userLanguage?:     string;

  /* Pre-computed snapshot (skips background Claude call) */
  analysisFull?:     Record<string, unknown>;
  analysisSummary?:  string;
  artenaInsight?:    string;

  /* Display */
  artist?:           string;
  artistNameKo?:     string;
  title?:            string;
  titleKo?:          string;
  year?:             string;
  medium?:           string;
  dimensions?:       string;
  representativeImageUrl?: string;
  imageUrl?:         string;

  /* Market snapshot */
  marketPosition?:       Report["marketPosition"];
  marketConfidence?:     number;
  estimatedRangeStatus?: Report["estimatedRangeStatus"];
  estimatedLow?:         number;
  estimatedHigh?:        number;
  currency?:             string;
  dataDepth?:            Report["dataDepth"];
  comparableMatches?:    number;
  marketStability?:      Report["marketStability"];

  /* Lifecycle */
  sourceType?:  Report["sourceType"];
  trustLevel?:  Report["trustLevel"];
  isShareable?: boolean;
}

interface State {
  reportId: string | null;
  status:   ReportStatus;
  cached:   boolean;
  stale:    boolean;
  report:   Report | null;
  error:    string | null;
}

const INITIAL: State = {
  reportId: null,
  status:   "processing",
  cached:   false,
  stale:    false,
  report:   null,
  error:    null,
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS        = 45;   // ~90s ceiling

export function useBackgroundReport() {
  const [state, setState] = useState<State>(INITIAL);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef   = useRef(false);
  const pollCountRef = useRef(0);

  const stopInternal = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
    stoppedRef.current   = true;
  };

  useEffect(() => () => stopInternal(), []);

  const fetchOne = async (id: string): Promise<Report | null> => {
    try {
      const res  = await fetch(`/api/reports/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!json.success || !json.report) return null;
      return json.report as Report;
    } catch {
      return null;
    }
  };

  const pollLoop = useCallback(async (id: string) => {
    if (stoppedRef.current) return;
    pollCountRef.current += 1;
    const report = await fetchOne(id);
    if (!report) {
      setState(s => ({ ...s, error: "report not found" }));
      return;
    }
    const status = report.status ?? "ready";
    setState(s => ({ ...s, report, status }));
    if (status === "processing" && pollCountRef.current < MAX_POLLS && !stoppedRef.current) {
      pollTimerRef.current = setTimeout(() => pollLoop(id), POLL_INTERVAL_MS);
    }
  }, []);

  const start = useCallback(async (input: GenerateInput): Promise<string | null> => {
    stopInternal();
    stoppedRef.current   = false;
    pollCountRef.current = 0;
    setState({ ...INITIAL });
    try {
      const res  = await fetch("/api/reports/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success || !json.reportId) {
        setState({ ...INITIAL, error: json.error || "generate failed" });
        return null;
      }
      const reportId = json.reportId as string;
      const status   = (json.status as ReportStatus) ?? "processing";
      setState({
        reportId,
        status,
        cached: !!json.cached,
        stale:  !!json.stale,
        report: null,
        error:  null,
      });
      // Always fetch the record at least once so consumers can read it.
      // Polling continues automatically when status is "processing".
      void pollLoop(reportId);
      return reportId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "generate failed";
      setState({ ...INITIAL, error: msg });
      return null;
    }
  }, [pollLoop]);

  const stop = useCallback(() => stopInternal(), []);

  return { ...state, start, stop };
}
