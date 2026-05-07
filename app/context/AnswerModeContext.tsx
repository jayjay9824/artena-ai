"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_ANSWER_MODE, type AnswerMode } from "../types/ai";

/**
 * AXVELA Mode System — Step 1 state container.
 *
 * Tracks two things only:
 *
 *   selectedMode          — the currently active answer mode
 *                            (defaults to "appreciation").
 *   isManualModeOverride  — true once the user has explicitly picked
 *                            a mode from any UI chip / picker. False
 *                            while the system / auto-derivation owns
 *                            the choice.
 *
 * Future steps surface a mode picker UI; setMode() is the single
 * mutation point and always flips the override flag so downstream
 * auto-derivation logic (Step 3+) knows whether to respect the
 * user's choice or recompute.
 *
 * resetMode() returns to the default and clears the override flag —
 * exposed for future "new artwork / new session" transitions.
 *
 * This file deliberately does not call any AI API, build any prompt,
 * or surface any UI. Steps 2-5 layer those on top.
 */

interface AnswerModeCtx {
  selectedMode:         AnswerMode;
  isManualModeOverride: boolean;
  /** UI / consumer entrypoint — sets the override flag too. */
  setMode:              (mode: AnswerMode) => void;
  /** System entrypoint — sets the mode without flipping the
   *  override flag (so auto-derivation can keep ownership). */
  setModeAuto:          (mode: AnswerMode) => void;
  /** Drop the user override + restore the default. */
  resetMode:            () => void;
}

const AnswerModeContext = createContext<AnswerModeCtx>({
  selectedMode:         DEFAULT_ANSWER_MODE,
  isManualModeOverride: false,
  setMode:              () => {},
  setModeAuto:          () => {},
  resetMode:            () => {},
});

export function AnswerModeProvider({ children }: { children: React.ReactNode }) {
  const [selectedMode,         setSelectedMode]         = useState<AnswerMode>(DEFAULT_ANSWER_MODE);
  const [isManualModeOverride, setIsManualModeOverride] = useState(false);

  const setMode = useCallback((mode: AnswerMode) => {
    setSelectedMode(mode);
    setIsManualModeOverride(true);
  }, []);

  const setModeAuto = useCallback((mode: AnswerMode) => {
    setSelectedMode(mode);
    // Intentional: do NOT flip the override flag — auto-derivation
    // should never look like a user choice.
  }, []);

  const resetMode = useCallback(() => {
    setSelectedMode(DEFAULT_ANSWER_MODE);
    setIsManualModeOverride(false);
  }, []);

  const value = useMemo(
    () => ({ selectedMode, isManualModeOverride, setMode, setModeAuto, resetMode }),
    [selectedMode, isManualModeOverride, setMode, setModeAuto, resetMode],
  );

  return (
    <AnswerModeContext.Provider value={value}>
      {children}
    </AnswerModeContext.Provider>
  );
}

export function useAnswerMode() {
  return useContext(AnswerModeContext);
}
