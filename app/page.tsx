'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ScanButton from '@/components/ui/ScanButton';
import MainInputBar from '@/components/layout/MainInputBar';
import ScanSheet from '@/components/scan/ScanSheet';
import AnalyzingScreen from '@/components/scan/AnalyzingScreen';
const AutoScannerView = dynamic(
  () => import('@/components/scan/AutoScannerView'),
  { ssr: false },
);
import ResultScreen from '@/components/result/ResultScreen';
import CollectionScreen from '@/components/collection/CollectionScreen';
import { readFileAsDataUrl, extractFromDataUrl } from '@/lib/image';
import { saveScan, type ScanHistoryItem } from '@/lib/scanHistory';
import {
  getTasteProfile,
  refreshTasteProfile,
  type TasteProfile,
} from '@/lib/tasteProfile';
import {
  generateRecommendations,
  type Recommendation,
} from '@/lib/recommendation';
import type {
  ArtworkReport,
  ArtistData,
  RecognitionSource,
  RecognitionStatus,
} from '@/lib/types';

type Phase =
  | 'idle'
  | 'sheet'
  | 'scanner'
  | 'analyzing'
  | 'result'
  | 'collection';
type ResultOrigin = 'scan' | 'collection';

const MIN_ANALYZING_MS = 1500;

const MOCK_INSIGHT: ArtworkReport = {
  artist: '작가 미확인',
  title: '이미지 기반 분석',
  year: '',
  medium: '',
  confidence: 62,
  isVerified: false,
  quickInsight: '이미지 기반 해석을 준비 중입니다.',
  interpretation:
    '시각 단서가 충분하지 않아 상세 해석을 보여드리지 못했습니다. 라벨을 함께 촬영하시면 보다 정확한 해석이 가능합니다.',
  artistContext: '',
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [insight, setInsight] = useState<ArtworkReport | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [resultOrigin, setResultOrigin] = useState<ResultOrigin>('scan');
  // Lazy initializer — read from localStorage synchronously on first render
  // to avoid a layout flash when the taste row first appears.
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(() =>
    typeof window !== 'undefined' ? getTasteProfile() : null,
  );
  // Home input value — controlled so recommendation taps can prefill it.
  const [inputValue, setInputValue] = useState('');
  // Question to send when entering 'analyzing' from a recommendation tap.
  // Captured by the analyzing useEffect closure on phase transition.
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  // Real artist data fetched from Wikipedia (or other source) — emitted by
  // the API stream as a separate event when available.
  const [artistData, setArtistData] = useState<ArtistData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openSheet = useCallback(() => setPhase('sheet'), []);
  const closeSheet = useCallback(() => setPhase('idle'), []);

  // Both the central SCAN button and the sheet's '작품 자동 스캔' option
  // route through the auto scanner. No more manual cameraInput trigger.
  const openScanner = useCallback(() => {
    setPhase('scanner');
  }, []);
  const cancelScanner = useCallback(() => {
    setPhase('idle');
  }, []);
  const onScannerCaptured = useCallback((dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setPendingQuestion(null);
    setResultOrigin('scan');
    setPhase('analyzing');
  }, []);

  const triggerUpload = useCallback(() => {
    setPhase('idle');
    fileInputRef.current?.click();
  }, []);
  const triggerRecent = useCallback(() => {
    setPhase('collection');
  }, []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setImageDataUrl(dataUrl);
        setPendingQuestion(null);    // image scan — drop any prior rec question
        setResultOrigin('scan');
        setPhase('analyzing');
      } catch {
        setImageDataUrl(null);
        setPendingQuestion(null);
        setResultOrigin('scan');
        setPhase('analyzing');
      }
    },
    [],
  );

  const openHistoryItem = useCallback((item: ScanHistoryItem) => {
    setInsight(item.insight);
    setImageDataUrl(item.imageDataUrl);
    setStreamingText('');
    setIsStreaming(false);
    setArtistData(null); // history items don't carry external artist data
    setResultOrigin('collection');
    setPhase('result');
  }, []);

  const closeResult = useCallback(() => {
    const back = resultOrigin === 'collection' ? 'collection' : 'idle';
    setPhase(back);
    setInsight(null);
    setStreamingText('');
    setIsStreaming(false);
    setPendingQuestion(null);
    setArtistData(null);
    if (back === 'idle') setImageDataUrl(null);
  }, [resultOrigin]);

  const closeCollection = useCallback(() => {
    setPhase('idle');
  }, []);

  // analyzing → stream /api/axvela/report (NDJSON) → progressive result.
  // After footer event: persist scan and refresh taste profile (best-effort).
  useEffect(() => {
    if (phase !== 'analyzing') return;

    let cancelled = false;
    const controller = new AbortController();

    let header: ArtworkReport | null = null;
    let interpretationAcc = '';
    let minDelayDone = false;
    let transitioned = false;

    // Reset artist data — fresh per analyzing run
    setArtistData(null);

    const tryTransition = () => {
      if (transitioned || !header || !minDelayDone || cancelled) return;
      transitioned = true;
      setInsight(header);
      setStreamingText(interpretationAcc);
      setIsStreaming(true);
      setPhase('result');
    };

    const minDelayTimer = setTimeout(() => {
      minDelayDone = true;
      tryTransition();
    }, MIN_ANALYZING_MS);

    (async () => {
      try {
        type Body = {
          outputLanguage: 'ko' | 'en';
          imageBase64?: string;
          imageMimeType?: string;
          userQuestion?: string;
        };
        const body: Body = { outputLanguage: 'ko' };
        if (imageDataUrl) {
          const parts = extractFromDataUrl(imageDataUrl);
          if (parts) {
            body.imageBase64 = parts.base64;
            body.imageMimeType = parts.mimeType;
          }
        }
        if (pendingQuestion) {
          body.userQuestion = pendingQuestion;
        }

        const res = await fetch('/api/axvela/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error('bad response');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (!cancelled) {
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

            if (event.type === 'header') {
              const d = event.data as Partial<ArtworkReport> & {
                recognitionSource?: RecognitionSource;
                recognitionStatus?: RecognitionStatus;
              };
              header = {
                artist: d.artist ?? '',
                title: d.title ?? '',
                year: d.year ?? '',
                medium: d.medium ?? '',
                quickInsight: d.quickInsight ?? '',
                interpretation: '',
                artistContext: '',
                confidence: typeof d.confidence === 'number' ? d.confidence : 0,
                isVerified: Boolean(d.isVerified),
                recognitionSource: d.recognitionSource,
                recognitionStatus: d.recognitionStatus,
                visualConfidence: d.visualConfidence,
                visualReason: d.visualReason,
                possibleCandidates: Array.isArray(d.possibleCandidates)
                  ? d.possibleCandidates
                  : [],
              };
              tryTransition();
            } else if (event.type === 'artistData') {
              const d = event.data as Partial<ArtistData>;
              if (
                typeof d.artist === 'string' &&
                typeof d.bio === 'string' &&
                d.bio.length > 0
              ) {
                setArtistData({
                  artist: d.artist,
                  bio: d.bio,
                  styles: Array.isArray(d.styles)
                    ? d.styles.filter((x): x is string => typeof x === 'string')
                    : [],
                  sampleWorks: Array.isArray(d.sampleWorks)
                    ? d.sampleWorks.filter(
                        (x): x is string => typeof x === 'string',
                      )
                    : [],
                  source:
                    d.source === 'wikiart' ? 'wikiart' : 'wikipedia',
                });
              }
            } else if (event.type === 'text') {
              const delta = typeof event.data === 'string' ? event.data : '';
              interpretationAcc += delta;
              if (transitioned && !cancelled) {
                setStreamingText(interpretationAcc);
              }
            } else if (event.type === 'footer') {
              const d = event.data as { artistContext?: string };
              if (header && !cancelled) {
                const finalReport: ArtworkReport = {
                  ...header,
                  interpretation: interpretationAcc,
                  artistContext: d.artistContext ?? '',
                };
                setInsight(finalReport);
                setStreamingText('');
                setIsStreaming(false);

                if (imageDataUrl && finalReport.confidence > 0) {
                  // Save to history, then recompute taste profile from the
                  // new history. Both are best-effort and never throw.
                  void saveScan(imageDataUrl, finalReport).then(() => {
                    if (cancelled) return;
                    setTasteProfile(refreshTasteProfile());
                  });
                }
              }
            }
          }
        }
      } catch {
        if (cancelled) return;
        if (!minDelayDone) {
          await new Promise((r) => setTimeout(r, MIN_ANALYZING_MS));
        }
        if (cancelled) return;
        setInsight(MOCK_INSIGHT);
        setStreamingText('');
        setIsStreaming(false);
        setPhase('result');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(minDelayTimer);
    };
  }, [phase, imageDataUrl]);

  // Subtle taste row — top artist · top style · top medium.
  // Hidden when nothing aggregated (e.g. only low-confidence scans).
  const tasteSummary = useMemo(() => {
    if (!tasteProfile) return [] as string[];
    return [
      tasteProfile.topArtists[0],
      tasteProfile.topStyles[0],
      tasteProfile.preferredMediums[0],
    ].filter((v): v is string => Boolean(v));
  }, [tasteProfile]);

  // Recommendations recompute when the taste profile changes (i.e. after
  // each new scan). Up to 3 items, never artists the user has already seen.
  const recommendations = useMemo(
    () => generateRecommendations(tasteProfile),
    [tasteProfile],
  );

  // Recommendation tap → prefill input + jump straight into the analyzing
  // → result flow with the question as userQuestion. No image is sent;
  // the service runs Claude with question-only input.
  const handleRecClick = useCallback((rec: Recommendation) => {
    const text = `${rec.artist}의 작품을 보여줘`;
    setInputValue(text);
    setPendingQuestion(text);
    setImageDataUrl(null);
    setResultOrigin('scan');
    setPhase('analyzing');
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#070708] text-white">
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
        <header className="px-6 pt-[calc(env(safe-area-inset-top)+24px)]">
          <div className="text-center text-[11px] font-light text-white/40">
            <span className="tracking-[0.32em]">AXVELA</span>
            <span className="ml-1 tracking-normal text-white/30">(엑스벨라)</span>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center px-6">
          <ScanButton onClick={openScanner} />

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

        <footer className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {tasteSummary.length > 0 && (
            <div className="mb-3 px-2 text-center">
              <div className="text-[10px] font-light tracking-[0.22em] text-white/30">
                당신의 취향 <span className="text-white/45">✦</span>
              </div>
              <div className="mt-1.5 text-[12px] font-light text-white/60">
                {tasteSummary.join(' · ')}
              </div>
            </div>
          )}
          {recommendations.length > 0 && (
            <div className="mb-3 px-2 text-center">
              <div className="text-[10px] font-light tracking-[0.22em] text-white/30">
                당신을 위한 작품 <span className="text-white/45">✦</span>
              </div>
              <div className="mt-1 text-[9px] font-light text-white/20">
                탭하여 바로 보기
              </div>
              <div className="mt-2 space-y-2">
                {recommendations.map((r, i) => (
                  <button
                    key={`${r.artist}-${i}`}
                    type="button"
                    onClick={() => handleRecClick(r)}
                    aria-label={`${r.artist}의 작품 검색`}
                    className="block w-full bg-transparent text-center
                               transition hover:opacity-80
                               active:opacity-50 focus:outline-none"
                  >
                    <div className="text-[12px] font-light text-white/80">
                      {r.artist}{' '}
                      <span className="text-white/25">·</span>{' '}
                      <span className="text-white/55">{r.title}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-light text-white/30">
                      {r.reason}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <MainInputBar
            onPlusClick={openSheet}
            value={inputValue}
            onChange={setInputValue}
          />
        </footer>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
        aria-hidden
      />

      <ScanSheet
        open={phase === 'sheet'}
        onClose={closeSheet}
        onScan={openScanner}
        onUpload={triggerUpload}
        onRecent={triggerRecent}
      />
      {phase === 'scanner' && (
        <div className="fixed inset-0 z-[100] bg-black">
          <AutoScannerView
            onCaptured={onScannerCaptured}
            onCancel={cancelScanner}
          />
        </div>
      )}
      <AnalyzingScreen active={phase === 'analyzing'} />
      <ResultScreen
        active={phase === 'result'}
        insight={insight}
        streamingText={isStreaming ? streamingText : null}
        isStreaming={isStreaming}
        imageDataUrl={imageDataUrl}
        artistData={artistData}
        onClose={closeResult}
      />
      <CollectionScreen
        active={phase === 'collection'}
        onClose={closeCollection}
        onSelect={openHistoryItem}
      />
    </main>
  );
}
