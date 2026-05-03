'use client';

import { useState, useEffect, useCallback } from 'react';
import ScanButton from '@/components/ui/ScanButton';
import MainInputBar from '@/components/layout/MainInputBar';
import ScanSheet from '@/components/scan/ScanSheet';
import AnalyzingScreen from '@/components/scan/AnalyzingScreen';

type Phase = 'idle' | 'sheet' | 'analyzing';

const ANALYZING_DURATION_MS = 1500;

export default function Home() {
  const [phase, setPhase] = useState<Phase>('idle');

  const openSheet = useCallback(() => setPhase('sheet'), []);
  const closeSheet = useCallback(() => setPhase('idle'), []);
  const startAnalyzing = useCallback(() => setPhase('analyzing'), []);

  // Auto-return to idle after the mock analyzing window.
  // STEP 4 will replace this with a transition to the result screen.
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const t = setTimeout(() => setPhase('idle'), ANALYZING_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#070708] text-white">
      {/* Premium dark gradient backdrop —
          top halo (cool gray) + bottom violet wash + base fade */}
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

      <div className="flex min-h-[100dvh] flex-col">
        {/* Top — wordmark */}
        <header className="px-6 pt-[calc(env(safe-area-inset-top)+24px)]">
          <div className="text-center text-[11px] font-light text-white/40">
            <span className="tracking-[0.32em]">AXVELA</span>
            <span className="ml-1 tracking-normal text-white/30">(엑스벨라)</span>
          </div>
        </header>

        {/* Center — Scan CTA + caption */}
        <section className="flex flex-1 flex-col items-center justify-center px-6">
          <ScanButton onClick={openSheet} />

          <div className="mt-12 text-center">
            <p className="text-[15px] font-light leading-relaxed text-white/75">
              작품을 스캔하거나 이미지를 올리세요{' '}
              <span className="text-white/50">✦</span>
            </p>
            <p className="mt-2 text-[13px] font-light text-white/40">
              제목이나 작가를 입력해도 됩니다
            </p>
          </div>
        </section>

        {/* Bottom — input bar */}
        <footer className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <MainInputBar onPlusClick={openSheet} />
        </footer>
      </div>

      {/* Overlays */}
      <ScanSheet
        open={phase === 'sheet'}
        onClose={closeSheet}
        onScan={startAnalyzing}
        onUpload={startAnalyzing}
      />
      <AnalyzingScreen active={phase === 'analyzing'} />
    </main>
  );
}
