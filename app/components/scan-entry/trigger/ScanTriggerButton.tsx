"use client";
import React from "react";
import { Plus } from "lucide-react";

interface Props {
  onClick:    () => void;
  ariaLabel?: string;
  disabled?:  boolean;
  /** Visual tone — "dark" inside the AI overlay, "light" for white surfaces. */
  tone?:      "dark" | "light";
}

/**
 * "+" entry point inside the AXVELA AI input pill.
 *
 * Not a generic attach button — opens the Scan / Upload / Recent
 * sheet. Premium minimal: 36×36 round, hairline border, no fill.
 */
export function ScanTriggerButton({
  onClick,
  ariaLabel = "Scan artwork",
  disabled  = false,
  tone      = "dark",
}: Props) {
  const palette = tone === "dark"
    ? "border-white/10 text-white/80 hover:bg-white/5 active:bg-white/10"
    : "border-border text-ink hover:bg-black/5 active:bg-black/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-full",
        "border-[0.5px] transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500/60",
        palette,
      ].join(" ")}
    >
      <Plus size={18} strokeWidth={1.6} aria-hidden />
    </button>
  );
}
