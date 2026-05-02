"use client";
import { useEffect, useReducer, useRef } from "react";
import type { QRAnalysis } from "../components/QuickReport";
import {
  AnalysisStages, INITIAL_STAGES, QuickView, StageKey, StagedAnalysisState,
} from "../types/staged";

/**
 * STEP 1 — Staged analysis state machine.
 *
 * The hook orchestrates the Quick View + Progressive Loading flow:
 *
 *   1) /api/analyze/quick (Haiku, ~2–3s) populates `quickView`. The
 *      Quick View card paints immediately and stays visible across
 *      the entire loading window — spec says "Quick View must remain
 *      visible. Do NOT block UI."
 *
 *   2) /api/analyze (Opus, ~10–30s) populates `fullAnalysis`. On
 *      completion, the remaining three stages (market / price /
 *      comparables) reveal sequentially with small delays so the
 *      check animation reads as progressive instead of "all at once".
 *
 * Both API calls fire concurrently — Quick View lands well before
 * the full analysis, so the UI is never blocked behind the slower
 * call.
 */

type Action =
  | { type: "RESET" }
  | { type: "QUICK_VIEW_READY"; quickView: QuickView }
  | { type: "STAGE";            stage: StageKey; status: AnalysisStages[StageKey] }
  | { type: "FULL_ANALYSIS";    analysis: QRAnalysis }
  | { type: "ERROR";            error: string };

const INITIAL_STATE: StagedAnalysisState = {
  quickView:    null,
  fullAnalysis: null,
  stages:       INITIAL_STAGES,
  error:        null,
};

function reducer(state: StagedAnalysisState, action: Action): StagedAnalysisState {
  switch (action.type) {
    case "RESET": return INITIAL_STATE;
    case "QUICK_VIEW_READY":
      /* When Quick View lands we know the full-analysis call is
         still in flight (~10–30s remaining). Mark every downstream
         stage as "loading" right away so AnalysisProcessFlow keeps
         pulsing the nodes + sweeping the pipeline-wide light during
         the wait — without this all three sit in "pending" for the
         whole window and the screen reads as frozen. The cascade
         on FULL_ANALYSIS still resolves them to "ready" in
         sequence (400 / 900 / 1400ms) for the staggered check. */
      return {
        ...state,
        quickView: action.quickView,
        stages: {
          ...state.stages,
          basic:       "ready",
          market:      "loading",
          price:       "loading",
          comparables: "loading",
        },
      };
    case "STAGE":
      return { ...state, stages: { ...state.stages, [action.stage]: action.status } };
    case "FULL_ANALYSIS":
      return { ...state, fullAnalysis: action.analysis };
    case "ERROR":
      return { ...state, error: action.error };
  }
}

export function useStagedAnalysis() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current = []; }, []);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    dispatch({ type: "RESET" });
  };

  const revealStage = (stage: StageKey, delay: number) => {
    dispatch({ type: "STAGE", stage, status: "loading" });
    const t = setTimeout(() => dispatch({ type: "STAGE", stage, status: "ready" }), delay);
    timers.current.push(t);
  };

  /**
   * Image-upload path. Fires the quick + full endpoints concurrently
   * — quick lands first, full follows. Stage reveals cascade from
   * the full response so each section's check animation reads as a
   * distinct event.
   */
  const runImage = async (file: Blob) => {
    reset();

    const quickFD = new FormData();
    quickFD.append("image", file, "scan.jpg");
    const fullFD  = new FormData();
    fullFD.append("image",  file, "scan.jpg");

    const quick = fetch("/api/analyze/quick", { method: "POST", body: quickFD })
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error || "Quick view failed");
        dispatch({ type: "QUICK_VIEW_READY", quickView: json.data });
      });

    const full = fetch("/api/analyze", { method: "POST", body: fullFD })
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error || "Analysis failed");
        dispatch({ type: "FULL_ANALYSIS", analysis: json.data });
        revealStage("market",      400);
        revealStage("price",       900);
        revealStage("comparables", 1400);
      });

    try {
      await Promise.all([quick, full]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      dispatch({ type: "ERROR", error: msg });
    }
  };

  return { ...state, runImage, reset };
}
