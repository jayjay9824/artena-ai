'use client';

import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Camera, Image as ImageIcon, Clock, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: () => void;
  onUpload: () => void;
  onRecent?: () => void;
};

export default function ScanSheet({
  open,
  onClose,
  onScan,
  onUpload,
  onRecent,
}: Props) {
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          />

          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px]
                       bg-[#0E0E12] ring-1 ring-white/10
                       pb-[calc(env(safe-area-inset-bottom)+12px)]"
          >
            <div className="flex justify-center pb-2 pt-3">
              <div className="h-1 w-9 rounded-full bg-white/15" />
            </div>

            <div className="px-2 pb-2">
              <Row
                icon={<Camera className="h-[18px] w-[18px]" strokeWidth={1.5} />}
                label="작품 스캔하기"
                onClick={onScan}
              />
              <Row
                icon={<ImageIcon className="h-[18px] w-[18px]" strokeWidth={1.5} />}
                label="이미지 업로드"
                onClick={onUpload}
              />
              <Row
                icon={<Clock className="h-[18px] w-[18px]" strokeWidth={1.5} />}
                label="최근 스캔 보기"
                onClick={onRecent}
                disabled={!onRecent}
              />
            </div>

            {/* Subtle accuracy hint — encourages capturing the wall label */}
            <div className="px-4 pb-1 pt-1 text-center text-[10px] font-light text-white/30">
              작품 라벨을 함께 촬영하면 정확도가 높아집니다{' '}
              <span className="text-white/45">✦</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl px-3 py-3.5
                   text-left opacity-40"
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-2xl
                     bg-white/[0.03] text-white/40 ring-1 ring-white/[0.06]"
        >
          {icon}
        </span>
        <span className="flex-1 text-[15px] font-light text-white/50">{label}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl px-3 py-3.5
                 text-left transition active:bg-white/[0.04]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-2xl
                   bg-white/[0.05] text-white/75 ring-1 ring-white/10"
      >
        {icon}
      </span>
      <span className="flex-1 text-[15px] font-light text-white/85">{label}</span>
      <ChevronRight className="h-4 w-4 text-white/25" strokeWidth={1.5} />
    </button>
  );
}
