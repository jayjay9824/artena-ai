"use client";
import React from "react";

interface Props {
  size?:  number;
  color?: string;
}

/**
 * Minimal viewfinder bracket icon — four corner L-strokes only, no
 * inner reticle. Used inside the central scan orb on Home and as the
 * camera badge on the bottom dock.
 */
export function ScanFrameIcon({ size = 52, color = "#FFFFFF" }: Props) {
  const s = 2;
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden>
      <path d="M8 18V12a4 4 0 0 1 4-4h6"     stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 8h6a4 4 0 0 1 4 4v6"     stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 34v6a4 4 0 0 1-4 4h-6"   stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 44h-6a4 4 0 0 1-4-4v-6"  stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
