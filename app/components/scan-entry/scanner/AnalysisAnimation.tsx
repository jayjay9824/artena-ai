"use client";
import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "../../../i18n/useLanguage";

interface Props {
  /** Captured image displayed underneath the scan-line sweep. */
  imageDataUrl?: string;
  /** Optional caption override. Default uses Step 5 spec copy. */
  caption?:      string;
}

/**
 * Premium analysis transition. Renders the captured image as the
 * surface, sweeps a soft scan line across it, and shows a quiet
 * status caption + dot pulse below. Apple / OpenAI minimal — no
 * spinners, no progress bars, no error surfaces. Suppressed under
 * prefers-reduced-motion.
 */
export function AnalysisAnimation({ imageDataUrl, caption }: Props) {
  const reducedMotion = useReducedMotion();
  const { lang }      = useLanguage();
  const label         = caption ?? (lang === "ko"
    ? "엑스벨라가 작품을 분석하고 있습니다"
    : "AXVELA is analyzing the artwork");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full flex-col items-center justify-center gap-4 py-6"
    >
      <div className="relative aspect-[4/5] w-[78%] max-w-[360px] overflow-hidden rounded-2xl bg-black/[0.85]">
        {imageDataUrl && (
          <img
            src={imageDataUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            draggable={false}
          />
        )}

        {/* Soft top-to-bottom dim so the scan line reads against
            both bright and dark images. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35" />

        {!reducedMotion && (
          <motion.span
            aria-hidden
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-300/85 to-transparent"
            initial={{ y: "0%",   opacity: 0 }}
            animate={{ y: "100%", opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 1.8,
              ease:     "easeInOut",
              repeat:   Infinity,
              times:    [0, 0.15, 0.85, 1],
            }}
            style={{ boxShadow: "0 0 14px rgba(196, 181, 253, 0.55)" }}
          />
        )}

        <span aria-hidden className="absolute inset-2 rounded-xl border-[0.5px] border-white/10" />
      </div>

      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-white/60"
            animate={reducedMotion ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
            transition={reducedMotion ? undefined : { duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>

      <p className="text-[13px] tracking-[0.04em] text-white/70">{label}</p>
    </div>
  );
}
