'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllScans, type ScanHistoryItem } from '@/lib/scanHistory';

type Props = {
  active: boolean;
  onClose: () => void;
  onSelect: (item: ScanHistoryItem) => void;
};

export default function CollectionScreen({ active, onClose, onSelect }: Props) {
  const [items, setItems] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    if (active) {
      // Instant load — synchronous read, no spinner.
      setItems(getAllScans());
    }
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
          className="fixed inset-0 z-[80] flex flex-col bg-[#070708] text-white"
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
              COLLECTION
            </div>
            <div className="h-10 w-10" aria-hidden />
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
            {items.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => (
                  <Card key={item.id} item={item} onClick={() => onSelect(item)} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Card({
  item,
  onClick,
}: {
  item: ScanHistoryItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded-xl bg-white/[0.025] text-left
                 ring-1 ring-white/[0.08] transition active:scale-[0.97]"
    >
      <div className="relative aspect-[4/5] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageDataUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute right-2 top-2 rounded-full
                     bg-black/55 px-2 py-0.5 text-[10px] font-light
                     text-white/85 backdrop-blur-sm ring-1 ring-white/10"
        >
          {item.confidence}%
        </div>
      </div>
      <div className="px-3 py-2.5">
        <div className="truncate text-[12px] font-light text-white/85">
          {item.artist || 'Unknown artist'}
        </div>
        <div className="truncate text-[11px] font-light text-white/45">
          {item.title || 'Artwork image'}
        </div>
      </div>
    </button>
  );
}

function Empty() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-[14px] font-light text-white/55">
        아직 저장된 스캔이 없습니다.
      </p>
      <p className="mt-2 text-[12px] font-light text-white/35">
        작품을 스캔하면 자동으로 여기에 보관됩니다.
      </p>
    </div>
  );
}
