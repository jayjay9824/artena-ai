'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { captureFromVideo, readFileAsDataUrl } from '@/lib/image';

type Props = {
  onCaptured: (dataUrl: string) => void;
  onCancel: () => void;
};

type Mode = 'requesting' | 'camera' | 'file_fallback';
type Stage = 'preparing' | 'capturing';

const PREPARE_MS = 1500;
const CAPTURE_MS = 2000;

/**
 * Live camera viewfinder + auto-capture.
 *
 * Architecture rules (do NOT regress):
 *  - No framer-motion / AnimatePresence anywhere on the outer overlay.
 *    The earlier bug was an intermediate function-component child of
 *    AnimatePresence, which silently stalled the enter animation in
 *    production builds and left the overlay at opacity 0.
 *  - No `active` prop. Parent mounts/unmounts via conditional render.
 *    That keeps camera/stream lifecycle tied to mount, not a flag.
 *  - Outer container is plain bg-black h-full w-full — fills the
 *    parent wrapper which provides fixed/inset/z-index.
 */
export default function AutoScannerView({ onCaptured, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOffRef = useRef(false);
  const [mode, setMode] = useState<Mode>('requesting');
  const [stage, setStage] = useState<Stage>('preparing');

  // 1) Acquire rear camera. On any failure (no API, denied, no device,
  //    insecure context) silently degrade to a file picker so the user
  //    still has a path forward — never show "Error" / "Failed".
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
      } catch {
        if (!cancelled) setMode('file_fallback');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // 2) Auto-capture timeline — only runs once camera is live.
  useEffect(() => {
    if (mode !== 'camera') return;
    if (handedOffRef.current) return;

    const t1 = setTimeout(() => setStage('capturing'), PREPARE_MS);
    const t2 = setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      const dataUrl = captureFromVideo(v);
      if (!dataUrl) {
        // canvas/taint/zero-dimension — silently fall back to file picker
        setMode('file_fallback');
        return;
      }
      handedOffRef.current = true;
      onCaptured(dataUrl);
    }, CAPTURE_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mode, onCaptured]);

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
    <div className="flex h-full w-full flex-col bg-black text-white">
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

      <div className="flex flex-1 items-center justify-center px-6">
        <div
          className="relative aspect-[4/5] w-full max-w-[420px] overflow-hidden
                     rounded-2xl bg-black ring-1 ring-white/10"
        >
          {/* Live camera feed — rendered as soon as the overlay mounts
              (NOT only when mode==='camera'). videoRef must exist when
              getUserMedia resolves so we can attach srcObject; gating
              the <video> behind mode==='camera' was the actual bug
              (videoRef.current was null at attach time → black frame). */}
          {mode !== 'file_fallback' && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* Brief placeholder text while getUserMedia is awaiting permission */}
          {mode === 'requesting' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-light tracking-[0.22em] text-white/35">
                CAMERA&nbsp;READY
              </span>
            </div>
          )}

          {/* 4-corner brackets — sit on top of video */}
          <span aria-hidden className="absolute left-3 top-3 h-[22px] w-px bg-white/55" />
          <span aria-hidden className="absolute left-3 top-3 h-px w-[22px] bg-white/55" />
          <span aria-hidden className="absolute right-3 top-3 h-[22px] w-px bg-white/55" />
          <span aria-hidden className="absolute right-3 top-3 h-px w-[22px] bg-white/55" />
          <span aria-hidden className="absolute bottom-3 left-3 h-[22px] w-px bg-white/55" />
          <span aria-hidden className="absolute bottom-3 left-3 h-px w-[22px] bg-white/55" />
          <span aria-hidden className="absolute bottom-3 right-3 h-[22px] w-px bg-white/55" />
          <span aria-hidden className="absolute bottom-3 right-3 h-px w-[22px] bg-white/55" />
        </div>
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6 text-center">
        {mode === 'file_fallback' ? (
          <>
            <p className="text-[14px] font-light leading-relaxed text-white/75">
              이미지를 선택하면 엑스벨라가 자동으로 분석합니다
            </p>
            <p className="mt-2 text-[11px] font-light text-white/30">
              카메라 접근이 어렵습니다. 갤러리에서 작품 사진을 골라 주세요.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
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
          </>
        ) : (
          <>
            <p className="text-[14px] font-light leading-relaxed text-white/75">
              {mode === 'requesting'
                ? '카메라 준비 중'
                : stage === 'preparing'
                  ? '작품을 화면 안에 맞춰주세요'
                  : '자동으로 캡처하고 있습니다'}
            </p>
            <p className="mt-3 text-[11px] font-light text-white/30">
              작품이 화면 중앙에 오면 자동으로 분석됩니다
            </p>
          </>
        )}
      </div>

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
