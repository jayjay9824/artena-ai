"use client";
import React from "react";
import { X } from "lucide-react";
import { ViewfinderOverlay } from "./ViewfinderOverlay";
import { useLanguage } from "../../../i18n/useLanguage";

interface Props {
  /** The live camera surface. Pass <video /> or a placeholder; the
   *  layout never owns the stream itself so it can be reused for
   *  upload-preview and recent-scan-preview surfaces too. */
  cameraSurface: React.ReactNode;
  onCapture:     () => void;
  onCancel:      () => void;
  /** Optional viewfinder hint override. */
  hint?:         string;
  /** Disables the capture button while transitioning to analysis. */
  capturing?:    boolean;
}

/**
 * Structural scaffold for the live-scan surface. Three layers:
 *   1. Full-bleed camera surface (passed in)
 *   2. ViewfinderOverlay corners + hint
 *   3. Bottom action row — Cancel + circular capture button
 *
 * No camera stream wiring here yet (Step 3 stops short of API
 * work). The component is reusable for both real and mock flows.
 */
export function SmartScannerLayout({
  cameraSurface,
  onCapture,
  onCancel,
  hint,
  capturing = false,
}: Props) {
  const { lang } = useLanguage();
  const cancelLabel  = lang === "ko" ? "닫기" : "Close";
  const captureLabel = lang === "ko" ? "촬영" : "Capture";

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black text-white">
      {/* Layer 1: camera surface */}
      <div className="absolute inset-0">
        {cameraSurface}
      </div>

      {/* Layer 2: viewfinder */}
      <ViewfinderOverlay hint={hint} />

      {/* Top bar — close only, no chrome */}
      <div className="relative flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={onCancel}
          aria-label={cancelLabel}
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full",
            "bg-white/10 backdrop-blur-md",
            "border-[0.5px] border-white/15 text-white/85",
            "hover:bg-white/15 active:bg-white/20",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400/70",
          ].join(" ")}
        >
          <X size={18} strokeWidth={1.6} aria-hidden />
        </button>
        <span className="text-[12px] tracking-[0.18em] text-white/60">AXVELA AI</span>
        <span className="h-9 w-9" aria-hidden />
      </div>

      {/* Layer 3: capture row */}
      <div className="mt-auto flex items-center justify-center pb-[calc(36px+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={onCapture}
          disabled={capturing}
          aria-label={captureLabel}
          className={[
            "h-[72px] w-[72px] rounded-full",
            "border-[3px] border-white/90 bg-transparent",
            "transition-transform active:scale-95",
            "disabled:opacity-40",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400/70",
          ].join(" ")}
        >
          <span className="block h-full w-full rounded-full bg-white/95" />
        </button>
      </div>
    </div>
  );
}
