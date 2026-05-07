"use client";
import React from "react";
import { useLanguage } from "../../../i18n/useLanguage";

interface Props {
  /** Optional hint shown above the frame. Defaults to a localized
   *  framing instruction. */
  hint?: string;
}

/**
 * Minimal viewfinder — four corner brackets + a soft hint line.
 * No heavy chrome, no decorative gradients. The camera surface
 * underneath stays in charge of its own video element.
 */
export function ViewfinderOverlay({ hint }: Props) {
  const { lang } = useLanguage();
  const message  = hint ?? (lang === "ko"
    ? "작품을 프레임 안에 맞춰주세요"
    : "Center the artwork in the frame");

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {/* Frame */}
      <div className="relative aspect-[4/5] w-[78%] max-w-[440px]">
        <Corner className="left-0  top-0    rotate-0"   />
        <Corner className="right-0 top-0    rotate-90"  />
        <Corner className="right-0 bottom-0 rotate-180" />
        <Corner className="left-0  bottom-0 -rotate-90" />

        {/* Hint */}
        <p className={[
          "absolute -top-10 left-1/2 -translate-x-1/2",
          "whitespace-nowrap text-[12px] tracking-[0.06em]",
          "text-white/75",
        ].join(" ")}>
          {message}
        </p>
      </div>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span
      className={[
        "absolute h-7 w-7",
        "border-l-[1.5px] border-t-[1.5px] border-white/85",
        "rounded-tl-[3px]",
        className,
      ].join(" ")}
    />
  );
}
