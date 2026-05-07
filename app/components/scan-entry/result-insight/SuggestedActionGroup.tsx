"use client";
import React from "react";
import { useLanguage } from "../../../i18n/useLanguage";
import type { QuickInsight } from "../shared/scanTypes";

export interface SuggestedAction {
  id:    string;
  label: string;
}

interface Props {
  insight?:    QuickInsight;
  /** Optional override — pass a curated list to bypass the
   *  default suggestions derived from the insight. */
  actions?:    SuggestedAction[];
  onSelect:    (action: SuggestedAction) => void;
}

/**
 * Suggested follow-up prompts that bridge Quick Insight → chat.
 * Tapping one feeds the action label back to the AI overlay as
 * the next user message.
 */
export function SuggestedActionGroup({ insight, actions, onSelect }: Props) {
  const { lang } = useLanguage();
  const list     = actions ?? defaultActions(insight, lang);
  if (list.length === 0) return null;

  return (
    <div className="w-full">
      <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">
        {lang === "ko" ? "이어서 물어보기" : "Ask next"}
      </p>
      <ul className="flex flex-wrap gap-2" role="list">
        {list.map((action) => (
          <li key={action.id} className="max-w-full">
            <button
              type="button"
              onClick={() => onSelect(action)}
              className={[
                "rounded-full border-[0.5px] border-border bg-white",
                "px-3.5 py-1.5 text-[12.5px] text-ink",
                "max-w-full text-left leading-snug",
                "[overflow-wrap:anywhere] [word-break:keep-all] whitespace-normal",
                "transition-colors hover:bg-black/[0.04] active:bg-black/[0.08]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500/60",
              ].join(" ")}
            >
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function defaultActions(insight: QuickInsight | undefined, lang: string): SuggestedAction[] {
  const ko = lang === "ko";
  const artist = insight?.artist;

  return [
    {
      id:    "artist",
      label: artist
        ? (ko ? `${artist} 작가에 대해 알려줘` : `Tell me about ${artist}`)
        : (ko ? "작가에 대해 알려줘"          : "Tell me about the artist"),
    },
    {
      id:    "market",
      label: ko ? "시장 가치 살펴보기" : "Look up market value",
    },
    {
      id:    "similar",
      label: ko ? "비슷한 작품 찾기"   : "Find similar works",
    },
  ];
}
