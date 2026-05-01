"use client";
import React from "react";
import { useLanguage } from "../../../i18n/useLanguage";
import type { ScannedArtwork } from "../shared/scanTypes";

interface Props {
  artwork: ScannedArtwork;
  /** Optional retry callback if the image cannot be analyzed.
   *  Visible only when the insight is missing entirely. */
  onRetry?: () => void;
}

/**
 * Captured-artwork card with image + provisional metadata. Shows
 * a "Draft" badge whenever the underlying insight is mock or
 * unverified — never a "Verified" affordance for unconfirmed data.
 *
 * Unanalyzable fallback copy:
 *   KO: "작품을 더 잘 볼 수 있는 이미지를 시도해보세요."
 *   EN: "Try a clearer image of the artwork."
 */
export function ScannedArtworkCard({ artwork, onRetry }: Props) {
  const { lang }  = useLanguage();
  const insight   = artwork.insight;
  const isDraft   = !insight || insight.isMock || !insight.isVerified;

  const draftLabel = lang === "ko" ? "초안" : "Draft";
  const retryCopy  = lang === "ko"
    ? "작품을 더 잘 볼 수 있는 이미지를 시도해보세요."
    : "Try a clearer image of the artwork.";
  const retryCta   = lang === "ko" ? "다시 시도" : "Try again";

  return (
    <article className={[
      "w-full max-w-[420px] overflow-hidden rounded-2xl",
      "border-[0.5px] border-border bg-white",
      "shadow-[0_2px_18px_-8px_rgba(0,0,0,0.18)]",
    ].join(" ")}>
      {/* Image */}
      <div className="relative aspect-[4/5] w-full bg-black/[0.04]">
        <img
          src={artwork.imageDataUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
        {isDraft && (
          <span className={[
            "absolute left-3 top-3 rounded-full",
            "bg-black/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white",
            "backdrop-blur-md",
          ].join(" ")}>
            {draftLabel}
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="px-4 py-4">
        {insight ? (
          <>
            <h3 className="text-[15px] font-medium text-ink">
              {insight.title ?? (lang === "ko" ? "제목 미정" : "Untitled")}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted">
              {[insight.artist, insight.year].filter(Boolean).join(" · ") || (lang === "ko" ? "정보 확인 중" : "Pending details")}
            </p>
            {insight.medium && (
              <p className="mt-1 text-[12px] text-muted/80">{insight.medium}</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-[14px] text-ink">{retryCopy}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={[
                  "rounded-full border-[0.5px] border-border",
                  "px-3.5 py-1.5 text-[12px] tracking-[0.04em] text-ink",
                  "hover:bg-black/[0.04] active:bg-black/[0.08]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500/60",
                ].join(" ")}
              >
                {retryCta}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
