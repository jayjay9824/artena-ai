"use client";
import React from "react";
import { isKakaoInApp, openInExternalBrowser } from "../../utils/browserDetect";

const FONT      = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

/**
 * Shown when the user taps SCAN inside KakaoTalk / Naver / FB /
 * Instagram / LINE in-app WebViews. Those browsers expose
 * `navigator.mediaDevices` but cannot actually start a camera
 * stream, so we surface a clear path before the user hits a
 * black-screen failure:
 *
 *   1. KakaoTalk only — "외부 브라우저로 열기"
 *      → kakaotalk://web/openExternal scheme via openInExternalBrowser
 *   2. "링크 복사하기"
 *      → clipboard fallback so the user can paste into Chrome /
 *        Safari manually
 *   3. "대신 이미지 업로드하기"
 *      → close the modal; in Step 3 this hooks into a file picker
 *        so users with a saved photo can analyze without the camera
 *
 * Pure presentation + clipboard + scheme call. No global state.
 */
interface Props {
  onClose: () => void;
  /**
   * Optional — when supplied, "대신 이미지 업로드하기" triggers a
   * file picker and bubbles the chosen file to the parent for
   * analysis. When absent the button just closes the modal.
   */
  onUploadFile?: (file: File) => void;
}

export function InAppBrowserWarningModal({ onClose, onUploadFile }: Props) {
  const isKakao = isKakaoInApp();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCopyLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      alert("링크가 복사되었습니다. Chrome 또는 Safari에서 붙여넣어 주세요.");
    } catch {
      // Clipboard API unavailable / blocked — fall back to the
      // legacy execCommand path. Some in-app browsers still need it.
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity  = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("링크가 복사되었습니다.");
      } catch {
        alert("링크 복사에 실패했습니다. 우측 상단 메뉴에서 직접 열어주세요.");
      }
    }
  };

  const handleUploadInstead = () => {
    if (onUploadFile) {
      fileInputRef.current?.click();
    } else {
      onClose();
    }
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file  = input.files?.[0];
    input.value = "";
    if (file && onUploadFile) {
      onUploadFile(file);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inapp-warning-title"
      style={S.backdrop}
    >
      <div style={S.card}>
        <div style={{ textAlign: "center" }}>
          <div style={S.icon} aria-hidden>📷</div>
          <h2 id="inapp-warning-title" style={S.title}>
            카메라는 외부 브라우저에서만 작동합니다
          </h2>
          <p style={S.body}>
            {isKakao
              ? "카카오톡 내부 브라우저는 카메라 사용을 지원하지 않습니다.\nChrome 또는 Safari에서 열어주세요."
              : "이 브라우저는 카메라를 지원하지 않습니다.\nChrome 또는 Safari에서 열어주세요."}
          </p>
        </div>

        <div style={S.actions}>
          {isKakao && (
            <button onClick={openInExternalBrowser} style={S.primaryBtn}>
              외부 브라우저로 열기
            </button>
          )}

          <button onClick={handleCopyLink} style={S.secondaryBtn}>
            링크 복사하기
          </button>

          <button onClick={handleUploadInstead} style={S.tertiaryBtn}>
            대신 이미지 업로드하기
          </button>
        </div>

        {isKakao && (
          <p style={S.hint}>
            우측 상단 [⋮] → &ldquo;다른 브라우저로 열기&rdquo;도 가능합니다
          </p>
        )}
      </div>

      {/* Hidden file input — tapped via the ref when the user picks
          "대신 이미지 업로드하기" and the parent supplied an
          onUploadFile callback. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChosen}
      />
    </div>
  );
}

const S = {
  backdrop: {
    position:       "fixed" as const,
    inset:          0,
    zIndex:         300,
    background:     "rgba(0,0,0,0.70)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        16,
    fontFamily:     FONT,
  },
  card: {
    background:    "#FFFFFF",
    borderRadius:  20,
    maxWidth:      430,
    width:         "100%",
    padding:       "26px 24px 22px",
    boxShadow:     "0 24px 60px rgba(0,0,0,0.32)",
    boxSizing:     "border-box" as const,
  },
  icon: {
    fontSize:     34,
    marginBottom: 10,
    lineHeight:   1,
  },
  title: {
    margin:        "0 0 8px",
    fontSize:      16,
    fontWeight:    700,
    color:         "#0D0D0D",
    fontFamily:    FONT_HEAD,
    letterSpacing: ".01em",
    lineHeight:    1.4,
  },
  body: {
    margin:       "0 0 22px",
    fontSize:     13,
    color:        "#5C5C5C",
    lineHeight:   1.6,
    whiteSpace:   "pre-line" as const,
    fontFamily:   FONT,
  },
  actions: {
    display:        "flex",
    flexDirection:  "column" as const,
    gap:            10,
  },
  primaryBtn: {
    width:          "100%",
    padding:        "13px 18px",
    background:     "#3B1E66",
    color:          "#FFFFFF",
    border:         "none",
    borderRadius:   999,
    cursor:         "pointer",
    fontFamily:     FONT,
    fontSize:       13.5,
    fontWeight:     600,
    letterSpacing:  ".04em",
  },
  secondaryBtn: {
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
  },
  tertiaryBtn: {
    width:          "100%",
    padding:        "10px 18px",
    background:     "transparent",
    color:          "#888888",
    border:         "none",
    cursor:         "pointer",
    fontFamily:     FONT,
    fontSize:       12.5,
  },
  hint: {
    margin:         "14px 0 0",
    fontSize:       11,
    color:          "#A0A0A0",
    textAlign:      "center" as const,
    fontFamily:     FONT,
    letterSpacing:  ".02em",
  },
} satisfies Record<string, React.CSSProperties>;
