'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, ArrowUp } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  ArtworkReport,
  ArtistData,
  RecognitionSource,
  RecognitionStatus,
  PossibleCandidate,
} from '@/lib/types';
import { extractFromDataUrl } from '@/lib/image';

const ACTIONS_LOW = [
  '이 작품에 대해 더 알려줘',
  '비슷한 스타일 찾아줘',
  '라벨 함께 촬영하기',
];

const ACTIONS_HIGH = [
  '이 작품 해석해줘',
  '작가의 다른 작품 보기',
];

function recognitionLabel(
  source?: RecognitionSource,
  status?: RecognitionStatus,
): string | null {
  switch (source) {
    case 'image_match':
      return '이미지 매치';
    case 'image_match_partial':
      return '유사 후보';
    case 'claude_visual':
      // Per spec: at PARTIAL (visualConfidence 50–79) surface as a
      // similarity-based estimate, not a confident reading.
      return status === 'FOUND' ? '이미지 기반 분석' : '이미지 유사도 기반 추정';
    case 'claude_visual_gemini_supported':
      return '라벨 검증 일치';
    case 'gemini_label':
      return '라벨 텍스트';
    case 'visual_uncertain':
      return '시각 분석';
    default:
      return null;
  }
}

type ChatMessage = { role: 'user' | 'assistant'; text: string };

type Props = {
  active: boolean;
  insight: ArtworkReport | null;
  streamingText?: string | null;
  isStreaming?: boolean;
  imageDataUrl?: string | null;
  artistData?: ArtistData | null;
  onClose: () => void;
};

export default function ResultScreen({
  active,
  insight,
  streamingText,
  isStreaming,
  imageDataUrl,
  artistData,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {active && insight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[70] flex flex-col bg-[#070708] text-white"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background: `
                radial-gradient(120% 80% at 50% 0%, rgba(80, 80, 110, 0.28) 0%, rgba(10, 10, 15, 0) 55%),
                radial-gradient(90% 60% at 50% 100%, rgba(70, 55, 110, 0.16) 0%, rgba(10, 10, 15, 0) 70%),
                linear-gradient(180deg, #0A0A0F 0%, #050507 100%)
              `,
            }}
          />

          <Header onClose={onClose} />
          <Body
            insight={insight}
            streamingText={streamingText ?? null}
            isStreaming={Boolean(isStreaming)}
            imageDataUrl={imageDataUrl ?? null}
            artistData={artistData ?? null}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
      <button
        onClick={onClose}
        aria-label="뒤로"
        className="flex h-10 w-10 items-center justify-center rounded-full
                   bg-white/[0.05] ring-1 ring-white/[0.08]
                   transition active:scale-95"
      >
        <ChevronLeft className="h-4 w-4 text-white/70" strokeWidth={1.5} />
      </button>
      <div className="text-[11px] font-light tracking-[0.32em] text-white/35">
        QUICK&nbsp;INSIGHT
      </div>
      <div className="h-10 w-10" aria-hidden />
    </header>
  );
}

function Body({
  insight,
  streamingText,
  isStreaming,
  imageDataUrl,
  artistData,
}: {
  insight: ArtworkReport;
  streamingText: string | null;
  isStreaming: boolean;
  imageDataUrl: string | null;
  artistData: ArtistData | null;
}) {
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Trust signal is now recognitionSource-driven: !isVerified means
  // Gemini didn't fully recognize, OR Claude fallback ran. The helper
  // text + LOW action set both follow this single switch.
  const isLow = !insight.isVerified;
  const actions = isLow ? ACTIONS_LOW : ACTIONS_HIGH;
  const recoLabel = recognitionLabel(
    insight.recognitionSource,
    insight.recognitionStatus,
  );

  // Live interpretation while streaming, static when settled.
  const interpretationText = isStreaming
    ? streamingText ?? ''
    : insight.interpretation;

  const scrollEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatHistory.length > 0) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatHistory.length]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      setIsSending(true);
      setInputValue('');

      // Append user + empty assistant placeholder; stream into the latter.
      setChatHistory((h) => [
        ...h,
        { role: 'user', text: trimmed },
        { role: 'assistant', text: '' },
      ]);

      type Body = {
        outputLanguage: 'ko' | 'en';
        imageBase64?: string;
        imageMimeType?: string;
        userQuestion: string;
      };
      const body: Body = { outputLanguage: 'ko', userQuestion: trimmed };
      if (imageDataUrl) {
        const parts = extractFromDataUrl(imageDataUrl);
        if (parts) {
          body.imageBase64 = parts.base64;
          body.imageMimeType = parts.mimeType;
        }
      }

      let aiText = '';

      try {
        const res = await fetch('/api/axvela/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) throw new Error('bad response');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: { type: string; data: unknown };
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }
            if (event.type !== 'text') continue; // chat ignores header/footer

            const delta = typeof event.data === 'string' ? event.data : '';
            aiText += delta;

            // Update the trailing assistant message in place.
            setChatHistory((h) => {
              if (h.length === 0) return h;
              const c = h.slice();
              const last = c[c.length - 1];
              if (last && last.role === 'assistant') {
                c[c.length - 1] = { role: 'assistant', text: aiText };
              }
              return c;
            });
          }
        }
      } catch {
        /* silent — fallback below */
      }

      if (!aiText) {
        const fb = '지금은 응답을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        setChatHistory((h) => {
          if (h.length === 0) return h;
          const c = h.slice();
          c[c.length - 1] = { role: 'assistant', text: fb };
          return c;
        });
      }

      setIsSending(false);
    },
    [imageDataUrl, isSending],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {/* Hero — uploaded image when present, else 4:5 mock card */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mx-auto overflow-hidden rounded-xl bg-white/[0.025] ring-1 ring-white/[0.08]"
        >
          <div className="relative aspect-[4/5] w-full">
            {imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageDataUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 70%)',
                  }}
                />
                <Brackets />
              </>
            )}
          </div>
        </motion.div>

        {/* Confidence row */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1
                     text-[12px] font-light text-white/55"
        >
          <span className="text-white/75">✦</span>
          <span>{insight.confidence}% Match</span>
          <span className="text-white/20">·</span>
          <span>Quick Insight</span>
          {recoLabel && (
            <>
              <span className="text-white/20">·</span>
              <span
                className={
                  insight.isVerified ? 'text-white/70' : 'text-white/55'
                }
              >
                {recoLabel}
              </span>
            </>
          )}
        </motion.div>

        {/* Chips — 2x2, max 4, not interactive */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-3 grid grid-cols-2 gap-2"
        >
          <Chip label="Artist" value={insight.artist} />
          <Chip label="Title" value={insight.title} />
          <Chip label="Year" value={insight.year} />
          <Chip label="Medium" value={insight.medium} />
        </motion.div>

        {/* Helper — only when confidence is low */}
        {isLow && (
          <motion.p
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="mt-5 text-[13px] font-light leading-relaxed text-white/55"
          >
            라벨을 함께 촬영하면 정확도가 높아집니다.
          </motion.p>
        )}

        {/* Possible artists — surfaced when Claude flagged candidates rather
            than asserting a single artist (visualConfidence below FOUND). */}
        {insight.possibleCandidates && insight.possibleCandidates.length > 0 && (
          <PossibleArtists candidates={insight.possibleCandidates} />
        )}

        {/* Interpretation — live grow during stream, line-clamp once settled */}
        {(interpretationText || isStreaming) && (
          <Interpretation text={interpretationText} isLive={isStreaming} />
        )}

        {/* Artist context — only on settled state with non-empty value */}
        {!isStreaming && insight.artistContext && (
          <motion.p
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="mt-3 text-[12px] font-light leading-relaxed text-white/40"
          >
            {insight.artistContext}
          </motion.p>
        )}

        {/* Artist info — real bio from external source (Wikipedia) */}
        {artistData && artistData.bio && <ArtistInfo data={artistData} />}

        {/* Suggested actions — confidence-aware. Tap → send. */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.46 }}
          className="mt-7"
        >
          <div className="text-[11px] font-light tracking-[0.18em] text-white/35">
            SUGGESTED
          </div>
          <div
            className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {actions.map((a) => (
              <button
                key={a}
                type="button"
                disabled={isSending || isStreaming}
                onClick={() => sendMessage(a)}
                className="shrink-0 rounded-full bg-white/[0.04] px-4 py-2.5
                           text-[13px] font-light text-white/80
                           ring-1 ring-white/[0.08] transition
                           active:scale-95 active:bg-white/[0.07]
                           disabled:opacity-40"
              >
                {a}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Chat history */}
        {chatHistory.length > 0 && (
          <div className="mt-8 space-y-5">
            {chatHistory.map((m, i) => (
              <div key={i}>
                <div
                  className={`text-[10px] font-light tracking-[0.22em] text-white/30 ${
                    m.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  {m.role === 'user' ? 'YOU' : 'AXVELA'}
                </div>
                <p
                  className={`mt-1 text-[14px] font-light leading-relaxed ${
                    m.role === 'user'
                      ? 'text-right text-white/85'
                      : 'text-white/75'
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>
        )}

        <div ref={scrollEndRef} aria-hidden />
      </div>

      <footer
        className="absolute inset-x-0 bottom-0
                   bg-gradient-to-t from-[#070708] via-[#070708]/95 to-transparent
                   px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-6"
      >
        <div
          className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-2 py-2
                     ring-1 ring-white/[0.08] backdrop-blur-xl"
        >
          <button
            type="button"
            aria-label="추가"
            className="flex h-10 w-10 shrink-0 items-center justify-center
                       rounded-full bg-white/[0.05] ring-1 ring-white/[0.08]
                       transition active:scale-95"
          >
            <Plus className="h-4 w-4 text-white/65" strokeWidth={1.5} />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isSending}
            placeholder="이 작품에 대해 물어보세요"
            className="flex-1 bg-transparent px-1 text-[15px] font-light
                       text-white/90 placeholder:text-white/30 focus:outline-none
                       disabled:opacity-50"
          />
          {inputValue.trim().length > 0 && (
            <button
              type="button"
              onClick={() => sendMessage(inputValue)}
              disabled={isSending}
              aria-label="전송"
              className="flex h-10 w-10 shrink-0 items-center justify-center
                         rounded-full bg-white/[0.08] ring-1 ring-white/[0.12]
                         transition active:scale-95
                         disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4 text-white/85" strokeWidth={2} />
            </button>
          )}
        </div>
      </footer>
    </>
  );
}

function ArtistInfo({ data }: { data: ArtistData }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!expanded) {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    }
  }, [data.bio, expanded]);

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="mt-7"
    >
      <div className="text-[11px] font-light tracking-[0.18em] text-white/35">
        ARTIST INFO
      </div>
      <div className="relative mt-3">
        <p
          ref={ref}
          className={`text-[13px] font-light leading-relaxed text-white/75 ${
            expanded ? '' : 'line-clamp-3'
          }`}
        >
          {data.bio}
        </p>
        {!expanded && overflowing && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7
                       bg-gradient-to-t from-[#070708] to-transparent"
          />
        )}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[12px] font-light text-white/55
                     transition active:opacity-60"
        >
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
      {data.sampleWorks.length > 0 && (
        <div className="mt-3 text-[11px] font-light leading-relaxed text-white/45">
          <span className="text-white/30">대표 작품 — </span>
          {data.sampleWorks.slice(0, 3).join(', ')}
        </div>
      )}
      <div className="mt-1 text-[9px] font-light tracking-[0.18em] text-white/20">
        SOURCE — {data.source.toUpperCase()}
      </div>
    </motion.div>
  );
}

function Interpretation({ text, isLive }: { text: string; isLive: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (isLive) return; // skip measurement during live updates — premium feel, no flicker
    const el = ref.current;
    if (!el) return;
    if (!expanded) {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    }
  }, [text, expanded, isLive]);

  // While streaming: show full text, no clamp, no toggle.
  if (isLive) {
    return (
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.34 }}
        className="mt-6"
      >
        <p
          ref={ref}
          className="text-[14px] font-light leading-relaxed text-white/85"
        >
          {text}
        </p>
      </motion.div>
    );
  }

  // Settled: line-clamp-3 with bottom fade + 더 보기 toggle.
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="mt-6"
    >
      <div className="relative">
        <p
          ref={ref}
          className={`text-[14px] font-light leading-relaxed text-white/85 ${
            expanded ? '' : 'line-clamp-3'
          }`}
        >
          {text}
        </p>
        {!expanded && overflowing && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7
                       bg-gradient-to-t from-[#070708] to-transparent"
          />
        )}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[12px] font-light text-white/55
                     transition active:opacity-60"
        >
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
    </motion.div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  // Empty / missing values render as a dim '—' so the row stays
  // structurally present without asserting "Unknown artist" coldly.
  const trimmed = (value ?? '').trim();
  const isEmpty = trimmed.length === 0;
  const display = isEmpty ? '—' : trimmed;
  return (
    <div className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.07]">
      <div className="text-[10px] font-light tracking-[0.22em] text-white/35">
        {label.toUpperCase()}
      </div>
      <div
        className={`mt-1 text-[14px] font-light leading-tight ${
          isEmpty ? 'text-white/30' : 'text-white/90'
        }`}
      >
        {display}
      </div>
    </div>
  );
}

function Brackets() {
  return (
    <>
      <span aria-hidden className="absolute left-3 top-3 h-[18px] w-px bg-white/30" />
      <span aria-hidden className="absolute left-3 top-3 h-px w-[18px] bg-white/30" />
      <span aria-hidden className="absolute right-3 top-3 h-[18px] w-px bg-white/30" />
      <span aria-hidden className="absolute right-3 top-3 h-px w-[18px] bg-white/30" />
      <span aria-hidden className="absolute bottom-3 left-3 h-[18px] w-px bg-white/30" />
      <span aria-hidden className="absolute bottom-3 left-3 h-px w-[18px] bg-white/30" />
      <span aria-hidden className="absolute bottom-3 right-3 h-[18px] w-px bg-white/30" />
      <span aria-hidden className="absolute bottom-3 right-3 h-px w-[18px] bg-white/30" />
    </>
  );
}

function PossibleArtists({ candidates }: { candidates: PossibleCandidate[] }) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.32 }}
      className="mt-5 rounded-2xl bg-white/[0.02] px-4 py-4 ring-1 ring-white/[0.06]"
    >
      <div className="text-[10px] font-light tracking-[0.22em] text-white/35">
        가능성 있는 작가
      </div>
      <div className="mt-3 space-y-2.5">
        {candidates.map((c, i) => (
          <div
            key={`${c.artist}-${i}`}
            className="flex items-baseline justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-light text-white/85">
                {c.artist}
              </div>
              {c.reason && (
                <div className="mt-0.5 text-[11px] font-light leading-relaxed text-white/45">
                  {c.reason}
                </div>
              )}
            </div>
            <div className="whitespace-nowrap text-[11px] font-light tabular-nums text-white/40">
              {c.confidence}%
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
