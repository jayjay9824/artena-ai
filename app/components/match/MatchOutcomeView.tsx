"use client";
import React from "react";
import type { Artwork, MatchOutcome } from "../../lib/types";
import { CandidateSelection, CandidateRow } from "./CandidateSelection";
import { NoMatch } from "./NoMatch";

/**
 * Single entry-point that maps a MatchOutcome to the right screen.
 *   confident  → caller routes directly (this view returns null)
 *   ambiguous  → CandidateSelection
 *   no_match   → NoMatch
 *
 * Callers pass a resolver that turns artworkIds into Artwork records
 * so the candidate UI can show thumbnail/title/year. The wrapper
 * doesn't fetch — staying decoupled from any specific catalogue.
 */

interface Props {
  outcome: MatchOutcome;
  /** Resolve { artworkId } → { artwork, artistName }. */
  resolveCandidate: (artworkId: string) => { artwork: Artwork; artistName: string } | null;

  onConfirmCandidate: (artworkId: string) => void;
  onTryAnotherImage:  () => void;
  onSearchByText:     () => void;
  onEnterManually:    () => void;
}

export function MatchOutcomeView({
  outcome, resolveCandidate,
  onConfirmCandidate, onTryAnotherImage, onSearchByText, onEnterManually,
}: Props) {
  if (outcome.kind === "confident") return null;

  if (outcome.kind === "ambiguous") {
    const rows: CandidateRow[] = outcome.candidates
      .map(m => {
        const r = resolveCandidate(m.artworkId);
        return r ? { match: m, artwork: r.artwork, artistName: r.artistName } : null;
      })
      .filter((r): r is CandidateRow => r !== null);

    // Spec: candidate UI fires when 2+ candidates exist. With only 1,
    // fall through to NoMatch — the user can confirm via search or try
    // again rather than auto-accepting a single mid-confidence guess.
    if (rows.length < 2) {
      return (
        <NoMatch
          onTryAnotherImage={onTryAnotherImage}
          onSearchByText={onSearchByText}
          onEnterManually={onEnterManually}
        />
      );
    }

    return (
      <CandidateSelection
        candidates={rows}
        onSelect={onConfirmCandidate}
        onNoMatch={() =>
          // Switch to NoMatch by re-routing through the parent's
          // onTryAnotherImage by default; consumer can override
          // by intercepting this in their resolver if needed.
          onTryAnotherImage()
        }
      />
    );
  }

  return (
    <NoMatch
      onTryAnotherImage={onTryAnotherImage}
      onSearchByText={onSearchByText}
      onEnterManually={onEnterManually}
    />
  );
}
