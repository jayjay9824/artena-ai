"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Global AXVELA AI overlay state.
 *
 * The AI surface is an overlay (no separate route) that can now be
 * triggered from anywhere — the bottom nav's middle tab, the
 * scanner's idle prompt, or any future entry point — without each
 * caller wiring its own state. The overlay itself is mounted once
 * at the providers level (see app/providers.tsx) and reads its
 * visibility from this context.
 */

interface AIOverlayContextValue {
  isAIMode: boolean;
  openAI:   () => void;
  closeAI:  () => void;
  toggleAI: () => void;
}

const Ctx = createContext<AIOverlayContextValue | null>(null);

export function AIOverlayProvider({ children }: { children: React.ReactNode }) {
  const [isAIMode, setIsAIMode] = useState(false);

  const openAI   = useCallback(() => setIsAIMode(true),  []);
  const closeAI  = useCallback(() => setIsAIMode(false), []);
  const toggleAI = useCallback(() => setIsAIMode(v => !v), []);

  const value = useMemo<AIOverlayContextValue>(
    () => ({ isAIMode, openAI, closeAI, toggleAI }),
    [isAIMode, openAI, closeAI, toggleAI],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAIOverlay(): AIOverlayContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAIOverlay must be used inside <AIOverlayProvider />");
  }
  return ctx;
}
