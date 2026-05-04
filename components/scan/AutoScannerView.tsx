'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  useAutoArtworkDetection,
  type DetectionState,
} from '@/hooks/useAutoArtworkDetection';
import { captureFromVideo, readFileAsDataUrl } from '@/lib/image';

type Mode = 'requesting' | 'camera' | 'file_fallback';

type Props = {
  active: boolean;
  onCaptured: (dataUrl: string) => void;
  onCancel: () => void;
};

/**
 * Conditional render with no AnimatePresence + motion.div wrapper around
 * the outer overlay. Framer-motion's AnimatePresence can stall the
 * enter animation when the motion component lives inside an
 * intermediate function-component child (which was the case before).
 * Using a plain <div> for the overlay guarantees it is visible the
 * instant `active` flips true. Inner moments (capture flash, status
 * text) still use motion components — those work fine inside the
 * always-mounted parent.
 */
export default function AutoScannerView({ active, onCaptured, onCancel }: Props) {
  if (!active) return null;
  return <ScannerOverlay onCaptured={onCaptured} onCancel={onCancel} />;
}

function ScannerOverlay({
  onCaptured,
  onCancel,
}: {
  onCaptured: (s: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOffRef = useRef(false);
  const [mode, setMode] = useState<Mode>('requesting');

  const { state, confidence, startDetection, resetDetection } =
    useAutoArtworkDetection();

  // Mount → request rear camera; on failure, degrade to file fallback.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        if (!cancelled) setMode('file_fallback');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setMode('camera');
        startDetection();
      } catch {
        if (!cancelled) setMode('file_fallback');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      resetDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When detection reaches 'auto_capturing' grab a frame and hand off.
  useEffect(() => {
    if (handedOffRef.current) return;
    if (state !== 'auto_capturing') return;
    if (mode !== 'camera') return;
    const v = videoRef.current;
    if (!v) return;

    const dataUrl = captureFromVideo(v);
    if (!dataUrl) {
      setMode('file_fallback');
      resetDetection();
      return;
    }
    handedOffRef.current = true;
    const t = setTimeout(() => onCaptured(dataUrl), 200);
    return () => clearTimeout(t);
  }, [state, mode, onCaptured, resetDetection]);

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      handedOffRef.current = true;
      onCaptured(dataUrl);
    } catch {
      /* silent — user can retry */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[#070708] text-white"
      style={{ opacity: 1 }}
    >
      {/* Premium gradient backdrop — same family as other screens */}
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

      {/* Close (top-left) */}
      <header className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={onCancel}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-full
                     bg-white/[0.05] ring-1 ring-white/[0.08]
                     transition active:scale-95"
        >
          <X className="h-4 w-4 text-white/70" strokeWidth={1.5} />
        </button>
        <div className="text-[11px] font-light tracking-[0.32em] text-white/35">
          AUTO&nbsp;SCAN
        </div>
        <div className="h-10 w-10" aria-hidden />
      </header>

      {/* Viewfinder */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div
          className="relative aspect-[4/5] w-full max-w-[420px] overflow-hidden
                     rounded-2xl bg-[#0A0A0F] ring-1 ring-white/10
                     shadow-[0_0_60px_-10px_rgba(180,180,220,0.18)]"
        >
          {mode === 'camera' && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {mode === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-light tracking-[0.22em] text-white/35">
                CAMERA&nbsp;READY
              </span>
            </div>
          )}

          {/* 4-corner brackets — brighten when artwork is detected */}
          <Brackets
            highlight={
              state === 'artwork_detected' || state === 'auto_capturing'
            }
          />

          {/* Scan line — top↔bottom sweep while detecting */}
          {(state === 'detecting' || state === 'artwork_detected') && (
            <ScanLine />
          )}

          {/* Capture flash */}
          {state === 'auto_capturing' && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.55, 0] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 bg-white"
            />
          )}
        </div>
      </div>

      {/* Status copy area */}
      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6">
        {mode === 'file_fallback' ? (
          <FileFallback
            onPick={() => fileInputRef.current?.click()}
            onCancel={onCancel}
          />
        ) : (
          <CameraStatus mode={mode} state={state} confidence={confidence} />
        )}
      </div>

      {/* Hidden file input — used by fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelected}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}

/* ─── Status surfaces ─── */

function CameraStatus({
  mode,
  state,
  confidence,
}: {
  mode: Mode;
  state: DetectionState;
  confidence: number;
}) {
  const text =
    mode === 'requesting'
      ? '카메라 준비 중'
      : state === 'idle' || state === 'detecting'
        ? '작품을 화면 안에 맞춰주세요'
        : state === 'artwork_detected'
          ? '작품을 인식했습니다'
          : state === 'auto_capturing'
            ? '자동으로 캡처하고 있습니다'
            : '';

  return (
    <div className="text-center">
      <p className="text-[14px] font-light leading-relaxed text-white/75">
        {text}
      </p>
      {(state === 'detecting' || state === 'artwork_detected') && (
        <div
          aria-hidden
          className="mx-auto mt-4 h-px w-[120px] overflow-hidden bg-white/10"
        >
          <div
            className="h-full bg-white/55 transition-all duration-150 ease-out"
            style={{ width: `${confidence}%` }}
          />
        </div>
      )}
      <p className="mt-3 text-[11px] font-light text-white/30">
        작품이 화면 중앙에 오면 자동으로 분석됩니다
      </p>
    </div>
  );
}

function FileFallback({
  onPick,
  onCancel,
}: {
  onPick: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="text-center">
      <p className="text-[14px] font-light leading-relaxed text-white/75">
        이미지를 선택하면 엑스벨라가 자동으로 분석합니다
      </p>
      <p className="mt-2 text-[11px] font-light text-white/30">
        카메라 접근이 어렵습니다. 갤러리에서 작품 사진을 골라 주세요.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button
          type="button"
          onClick={onPick}
          className="rounded-full bg-white/[0.08] px-5 py-2.5
                     text-[13px] font-light text-white/85
                     ring-1 ring-white/[0.12] transition active:scale-95"
        >
          이미지 선택
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-transparent px-5 py-2.5
                     text-[13px] font-light text-white/40
                     ring-1 ring-white/[0.06] transition active:scale-95"
        >
          취소
        </button>
      </div>
    </div>
  );
}

/* ─── Visual bits ─── */

function Brackets({ highlight }: { highlight: boolean }) {
  const tone = highlight ? 'bg-white/70' : 'bg-white/35';
  return (
    <>
      <span aria-hidden className={`absolute left-3 top-3 h-[22px] w-px ${tone} transition-colors`} />
      <span aria-hidden className={`absolute left-3 top-3 h-px w-[22px] ${tone} transition-colors`} />
      <span aria-hidden className={`absolute right-3 top-3 h-[22px] w-px ${tone} transition-colors`} />
      <span aria-hidden className={`absolute right-3 top-3 h-px w-[22px] ${tone} transition-colors`} />
      <span aria-hidden className={`absolute bottom-3 left-3 h-[22px] w-px ${tone} transition-colors`} />
      <span aria-hidden className={`absolute bottom-3 left-3 h-px w-[22px] ${tone} transition-colors`} />
      <span aria-hidden className={`absolute bottom-3 right-3 h-[22px] w-px ${tone} transition-colors`} />
      <span aria-hidden className={`absolute bottom-3 right-3 h-px w-[22px] ${tone} transition-colors`} />
    </>
  );
}

function ScanLine() {
  return (
    <motion.div
      aria-hidden
      className="absolute inset-x-0 h-[2px]"
      style={{
        background:
          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(220,220,255,0.6) 50%, rgba(255,255,255,0) 100%)',
        boxShadow: '0 0 12px rgba(180,180,220,0.55)',
      }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
