"use client";
import React, { useRef } from "react";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

/**
 * Image upload fallback — works inside in-app WebViews where
 * navigator.mediaDevices.getUserMedia is blocked.
 *
 *   <input type="file" accept="image/*" capture="environment">
 *
 * The `capture="environment"` hint asks mobile browsers to launch
 * the rear camera directly when the input is tapped. KakaoTalk's
 * WebView (and most other in-app browsers) honor this — users can
 * shoot a fresh photo or pick from the gallery, then the bytes
 * flow into the same analyze pipeline as a real camera capture.
 *
 * This is the V1 escape hatch for users who refuse to bounce out
 * of KakaoTalk via the kakaotalk://web/openExternal scheme.
 */
interface Props {
  onImageSelected: (file: File) => void;
  /** Optional button label. Default matches the V1 spec copy. */
  label?:  string;
  /** Optional inline style override; falls back to a neutral
   *  white pill consistent with the home / modal design language. */
  style?:  React.CSSProperties;
  /** Optional class — primarily for compatibility with utility-CSS
   *  callers; inline `style` is the source of truth here. */
  className?: string;
}

export function ImageUploadFallback({
  onImageSelected,
  label     = "이미지 업로드 / 사진 촬영",
  style,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file  = input.files?.[0];
    // Reset so re-selecting the same file fires onChange again.
    input.value = "";
    if (file) onImageSelected(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // Mobile browsers (incl. KakaoTalk WebView) launch the
        // rear camera directly when this attribute is present.
        // Desktop browsers ignore it gracefully and show the
        // standard file picker.
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={className}
        style={style ?? DEFAULT_BTN_STYLE}
      >
        {label}
      </button>
    </>
  );
}

const DEFAULT_BTN_STYLE: React.CSSProperties = {
  width:          "100%",
  padding:        "12px 18px",
  background:     "#F2F2F2",
  color:          "#1A1A1A",
  border:         "none",
  borderRadius:   999,
  cursor:         "pointer",
  fontFamily:     FONT,
  fontSize:       13.5,
  fontWeight:     600,
  letterSpacing:  ".04em",
};
