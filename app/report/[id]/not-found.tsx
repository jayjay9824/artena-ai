import Link from "next/link";

export default function ReportNotFound() {
  return (
    <div style={{
      minHeight: "calc(var(--vh, 1vh) * 100)", background: "#F8F7F4",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 28px", textAlign: "center" as const,
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
    }}>
      <div>
        <p style={{
          fontSize: 11, color: "#8A6A3F", letterSpacing: ".22em",
          textTransform: "uppercase" as const, marginBottom: 14,
        }}>
          AXVELA AI
        </p>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "#111111",
          margin: "0 0 10px",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif",
          letterSpacing: "-.02em", lineHeight: 1.25,
        }}>
          We couldn&apos;t find that report.
        </h1>
        <p style={{
          fontSize: 13, color: "#6F6F6F", lineHeight: 1.65,
          margin: "0 0 28px",
        }}>
          The link may have expired or the analysis may have been removed.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            background: "#111111", color: "#FFFFFF",
            border: "none", borderRadius: 12,
            fontSize: 13, fontWeight: 600, letterSpacing: ".04em",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            textDecoration: "none",
          }}
        >
          홈으로 가기
        </Link>
      </div>
    </div>
  );
}
