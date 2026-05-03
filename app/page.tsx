'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ScanButton from '@/components/ui/ScanButton';
import MainInputBar from '@/components/layout/MainInputBar';
import ScanSheet from '@/components/scan/ScanSheet';
import AnalyzingScreen from '@/components/scan/AnalyzingScreen';
import ResultScreen from '@/components/result/ResultScreen';
import { readFileAsDataUrl, extractFromDataUrl } from '@/lib/image';
import type { Insight } from '@/lib/types';

type Phase = 'idle' | 'sheet' | 'analyzing' | 'result';

const MIN_ANALYZING_MS = 1500;

const MOCK_INSIGHT: Insight = {
  artist: 'Unknown artist',
  title: 'Artwork image',
  year: 'Analysis pending',
  medium: 'Image-based analysis',
  confidence: 62,
  isVerified: false,
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [insight, setInsight] = useState<Insight | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openSheet = useCallback(() => setPhase('sheet'), []);
  const closeSheet = useCallback(() => setPhase('idle'), []);

  // Sheet handlers — close sheet, then open the appropriate file picker.
  // The synchronous .click() inside the same event handler keeps the
  // browser permission gesture intact.
  const triggerScan = useCallback(() => {
    setPhase('idle');
    cameraInputRef.current?.click();
  }, []);
  const triggerUpload = useCallback(() => {
    setPhase('idle');
    fileInputRef.current?.click();
  }, []);

  // File chosen — read as data URL, store, transition to analyzing.
  // Errors here are non-fatal: we still go to analyzing and the API
  // service falls back to a neutral report.
  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // reset so picking the same file again triggers change
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setImageDataUrl(dataUrl);
        setPhase('analyzing');
      } catch {
        setImageDataUrl(null);
        setPhase('analyzing');
      }
    },
    [],
  );

  const closeResult = useCallback(() => {
    setPhase('idle');
    setInsight(null);
    setImageDataUrl(null);
  }, []);

  // analyzing → call /api/axvela/report (with image when present) → result.
  // Image base64 is sent in the body but never logged on either side.
  // Promise.all enforces a minimum analyzing display so the cross-fade
  // never flashes regardless of API speed.
  useEffect(() => {
    if (phase !== 'analyzing') return;

    let cancelled = false;
    const controller = new AbortController();

    type Body = {
      outputLanguage: 'ko' | 'en';
      imageBase64?: string;
      imageMimeType?: string;
    };
    const body: Body = { outputLanguage: 'ko' };
    if (imageDataUrl) {
      const parts = extractFromDataUrl(imageDataUrl);
      if (parts) {
        body.imageBase64 = parts.base64;
        body.imageMimeType = parts.mimeType;
      }
    }

    const apiCall = fetch('/api/axvela/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const minDelay = new Promise<void>((r) => setTimeout(r, MIN_ANALYZING_MS));

    Promise.all([apiCall, minDelay]).then(([data]) => {
      if (cancelled) return;
      const next: Insight =
        data && data.success && data.insight ? data.insight : MOCK_INSIGHT;
      setInsight(next);
      setPhase('result');
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [phase, imageDataUrl]);

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

      {/* Hidden file inputs — camera-preferred and gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
        aria-hidden
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
        aria-hidden
      />

      {/* Overlays */}
      <ScanSheet
        open={phase === 'sheet'}
        onClose={closeSheet}
        onScan={triggerScan}
        onUpload={triggerUpload}
      />
      <AnalyzingScreen active={phase === 'analyzing'} />
      <ResultScreen
        active={phase === 'result'}
        insight={insight}
        imageDataUrl={imageDataUrl}
        onClose={closeResult}
      />
    </main>
  );
}
