"use client";
import React, { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScanLine, ImagePlus, Clock } from "lucide-react";
import { useLanguage } from "../../../i18n/useLanguage";
import type { ScanSheetAction } from "../shared/scanTypes";

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSelect: (action: ScanSheetAction) => void;
}

interface Row {
  action:  ScanSheetAction;
  ko:      string;
  en:      string;
  icon:    React.ReactNode;
}

const ROWS: Row[] = [
  { action: "scan",   ko: "작품 스캔하기",   en: "Scan artwork",  icon: <ScanLine  size={20} strokeWidth={1.6} aria-hidden /> },
  { action: "upload", ko: "이미지 업로드",   en: "Upload image",  icon: <ImagePlus size={20} strokeWidth={1.6} aria-hidden /> },
  { action: "recent", ko: "최근 스캔 보기", en: "Recent scans",  icon: <Clock     size={20} strokeWidth={1.6} aria-hidden /> },
];

/**
 * Three-row bottom sheet. The Physical → Data → Conversation
 * gateway, never a generic attachment menu.
 *
 * Visual: white surface on dimmed backdrop, hairline divider,
 * spring slide-up. Honors prefers-reduced-motion.
 */
export function ScanBottomSheet({ open, onClose, onSelect }: Props) {
  const { lang }      = useLanguage();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scan-sheet-root"
          className="fixed inset-0 z-[120] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          aria-hidden={!open}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={lang === "ko" ? "스캔 옵션" : "Scan options"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{    y: "100%" }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 36, mass: 0.9 }
            }
            className={[
              "relative w-full max-w-[640px]",
              "rounded-t-[28px] bg-white text-ink",
              "shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.25)]",
              "pb-[calc(20px+env(safe-area-inset-bottom,0px))]",
            ].join(" ")}
          >
            {/* Grabber */}
            <div className="flex justify-center pt-3 pb-1">
              <span className="block h-1 w-9 rounded-full bg-black/15" />
            </div>

            <ul role="menu" className="px-2 pt-1">
              {ROWS.map((row, i) => (
                <li key={row.action} role="none" className={i > 0 ? "border-t-[0.5px] border-border" : ""}>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => onSelect(row.action)}
                    className={[
                      "flex w-full items-center gap-4 px-5 py-4",
                      "text-left transition-colors",
                      "hover:bg-black/[0.03] active:bg-black/[0.06]",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-500/60",
                    ].join(" ")}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-ink">
                      {row.icon}
                    </span>
                    <span className="flex-1 text-[15px] leading-tight">
                      {lang === "ko" ? row.ko : row.en}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
