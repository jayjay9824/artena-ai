/**
 * STEP 1 — Quick View + Progressive Loading types.
 *
 * Quick View is the minimal 7-field card rendered within 3–5s. The
 * four AnalysisStages drive the staged section list that replaces
 * the loading spinner.
 *
 * Quick View is the source of truth during the loading window — it
 * paints once and stays visible until the user navigates away.
 */

import type { QRAnalysis } from "../components/QuickReport";

export interface QuickView {
  title:                 string;
  artist:                string;
  year:                  string;
  oneLineInterpretation: string;
  /** Spec: exactly 3 keywords. Keep it sliced even if the API over-returns. */
  keywords:              string[];
  /** Major collection / gallery line — optional. Empty string treated as absent. */
  exhibitionVenue?:      string;
}

export type StageStatus = "pending" | "loading" | "ready" | "error";

export type StageKey = "basic" | "market" | "price" | "comparables";

export type AnalysisStages = Record<StageKey, StageStatus>;

export const INITIAL_STAGES: AnalysisStages = {
  basic:       "loading",
  market:      "pending",
  price:       "pending",
  comparables: "pending",
};

export interface StagedAnalysisState {
  quickView:    QuickView | null;
  fullAnalysis: QRAnalysis | null;
  stages:       AnalysisStages;
  error:        string | null;
}
