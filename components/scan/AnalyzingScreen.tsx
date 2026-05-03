'use client';

import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  active: boolean;
};

export default function AnalyzingScreen({ active }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
          className="fixed inset-0 z-[60] bg-[#070708] text-white"
        >
          {/* Matching premium gradient backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(120% 80% at 50% 0%, rgba(80, 80, 110, 0.28) 0%, rgba(10, 10, 15, 0) 55%),
                radial-gradient(90% 60% at 50% 100%, rgba(70, 55, 110, 0.16) 0%, rgba(10, 10, 15, 0) 70%),
                linear-gradient(180deg, #0A0A0F 0%, #050507 100%)
              `,
            }}
          />

          <div className="relative flex h-full flex-col items-center justify-center px-6">
            <ArtworkFrame />

            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-10 text-[14px] font-light tracking-wide text-white/70"
            >
              엑스벨라가 작품을 분석하고 있습니다
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ArtworkFrame() {
  return (
    <div
      className="relative aspect-[4/5] w-[260px] overflow-hidden rounded-2xl
                 bg-white/[0.025] ring-1 ring-white/10
                 shadow-[0_0_60px_-10px_rgba(180,180,220,0.2)]"
    >
      {/* Subtle inner texture — hints at "an image" without showing one */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 70%)',
        }}
      />

      {/* Horizontal scan line — top → bottom → top, soft glow */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(220,220,255,0.6) 50%, rgba(255,255,255,0) 100%)',
          boxShadow: '0 0 12px rgba(180,180,220,0.55)',
        }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 4-corner brackets — viewfinder metaphor */}
      <Brackets />
    </div>
  );
}

function Brackets() {
  // 18px-long L-shaped corner marks
  return (
    <>
      {/* Top-left */}
      <span aria-hidden className="absolute left-3 top-3 h-[18px] w-px bg-white/40" />
      <span aria-hidden className="absolute left-3 top-3 h-px w-[18px] bg-white/40" />
      {/* Top-right */}
      <span aria-hidden className="absolute right-3 top-3 h-[18px] w-px bg-white/40" />
      <span aria-hidden className="absolute right-3 top-3 h-px w-[18px] bg-white/40" />
      {/* Bottom-left */}
      <span aria-hidden className="absolute bottom-3 left-3 h-[18px] w-px bg-white/40" />
      <span aria-hidden className="absolute bottom-3 left-3 h-px w-[18px] bg-white/40" />
      {/* Bottom-right */}
      <span aria-hidden className="absolute bottom-3 right-3 h-[18px] w-px bg-white/40" />
      <span aria-hidden className="absolute bottom-3 right-3 h-px w-[18px] bg-white/40" />
    </>
  );
}
