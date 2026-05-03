'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Insight } from '@/lib/types';

const CONFIDENCE_THRESHOLD = 75;

const ACTIONS_LOW = [
  '이 작품에 대해 더 알려줘',
  '비슷한 스타일 찾아줘',
  '라벨 함께 촬영하기',
];

const ACTIONS_HIGH = [
  '이 작품 해석해줘',
  '작가의 다른 작품 보기',
];

type Props = {
  active: boolean;
  insight: Insight | null;
  imageDataUrl?: string | null;
  onClose: () => void;
};

export default function ResultScreen({ active, insight, imageDataUrl, onClose }: Props) {
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
          {/* Matching premium gradient backdrop */}
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
          <Body insight={insight} imageDataUrl={imageDataUrl ?? null} />
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

function Body({ insight, imageDataUrl }: { insight: Insight; imageDataUrl: string | null }) {
  const [inputValue, setInputValue] = useState('');
  const isLow = insight.confidence < CONFIDENCE_THRESHOLD;
  const actions = isLow ? ACTIONS_LOW : ACTIONS_HIGH;

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
          className="mt-5 flex items-center gap-2 text-[12px] font-light text-white/55"
        >
          <span className="text-white/75">✦</span>
          <span>{insight.confidence}% Match</span>
          <span className="text-white/20">·</span>
          <span>Quick Insight</span>
        </motion.div>

        {/* Chips — 2x2 grid, max 4. Not interactive. */}
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

        {/* Helper — only when confidence is below the threshold */}
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

        {/* Suggested actions — confidence-aware list */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.34 }}
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
                onClick={() => setInputValue(a)}
                className="shrink-0 rounded-full bg-white/[0.04] px-4 py-2.5
                           text-[13px] font-light text-white/80
                           ring-1 ring-white/[0.08] transition
                           active:scale-95 active:bg-white/[0.07]"
              >
                {a}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Input bar — sticky bottom, fades into base */}
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
            placeholder="이 작품에 대해 물어보세요"
            className="flex-1 bg-transparent px-1 text-[15px] font-light
                       text-white/90 placeholder:text-white/30 focus:outline-none"
          />
        </div>
      </footer>
    </>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.07]">
      <div className="text-[10px] font-light tracking-[0.22em] text-white/35">
        {label.toUpperCase()}
      </div>
      <div className="mt-1 text-[14px] font-light leading-tight text-white/90">
        {value}
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
