"use client";

import { useEffect, useRef, useState } from "react";

/* ─────────────────────────── helpers ─────────────────────────── */

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ─────────────────────────── components ─────────────────────────── */

function FadeSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="w-full h-px bg-[#e5e5e5]" />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] tracking-[0.18em] uppercase text-[#9a9a9a] font-medium">
      {children}
    </span>
  );
}

/* ─────────────────────────── nav ─────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid #e5e5e5" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        {/* Logo — container clips internal whitespace by scaling image beyond bounds */}
        <div
          style={{
            height: "32px",
            width: "140px",
            overflow: "hidden",
            position: "relative",
            flexShrink: 0,
            opacity: 1,
            transition: "opacity 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.5")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Gemini_Generated_Image_ta7r94ta7r94ta7r.png"
            alt="AXVELA AI"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              height: "300%",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────── phone mockup ─────────────────────────── */

const AI_PARAGRAPHS = [
  "This work is by Claude Monet, painted in 1908 as part of his Water Lilies series.",
  "Rather than capturing a fixed subject, Monet explores light, reflection, and the shifting atmosphere on the water's surface.",
  "The scene dissolves into color and sensation, inviting the viewer to experience the moment rather than simply observe it.",
];

function PhoneCard() {
  const [phase, setPhase] = useState<"image" | "typing" | "waiting" | "response">("image");
  const [typedText, setTypedText] = useState("");
  const userMessage = "Who created this artwork?";

  useEffect(() => {
    const t = setTimeout(() => setPhase("typing"), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "typing") return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTypedText(userMessage.slice(0, i));
      if (i >= userMessage.length) {
        clearInterval(iv);
        setTimeout(() => setPhase("waiting"), 380);
      }
    }, 48);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setTimeout(() => setPhase("response"), 920);
    return () => clearTimeout(t);
  }, [phase]);

  const showUser = phase !== "image";
  const showAI   = phase === "response";

  /* ── inline style tokens ── */
  const S = {
    frame: {
      width: "272px",
      background: "linear-gradient(160deg, #f7f7f7 0%, #e9e9e9 100%)",
      borderRadius: "50px",
      padding: "10px",
      boxShadow: [
        "0 40px 90px rgba(0,0,0,0.13)",
        "0 8px 24px rgba(0,0,0,0.07)",
        "inset 0 1px 0 rgba(255,255,255,0.95)",
        "inset 0 -1px 0 rgba(0,0,0,0.07)",
      ].join(", "),
      border: "1px solid #d4d4d4",
      position: "relative" as const,
    },
    btnL: (top: number, h: number): React.CSSProperties => ({
      position: "absolute",
      left: "-3.5px",
      top,
      width: "3.5px",
      height: h,
      background: "linear-gradient(to right, #b8b8b8, #d0d0d0)",
      borderRadius: "3px 0 0 3px",
    }),
    btnR: (top: number, h: number): React.CSSProperties => ({
      position: "absolute",
      right: "-3.5px",
      top,
      width: "3.5px",
      height: h,
      background: "linear-gradient(to left, #b8b8b8, #d0d0d0)",
      borderRadius: "0 3px 3px 0",
    }),
    screen: {
      background: "#fff",
      borderRadius: "42px",
      overflow: "hidden" as const,
    },
  };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {/* ── phone frame ── */}
      <div style={S.frame}>

        {/* side buttons */}
        <div style={S.btnL(88,  26)} />
        <div style={S.btnL(124, 26)} />
        <div style={S.btnR(108, 44)} />

        {/* screen */}
        <div style={S.screen}>

          {/* status bar */}
          <div style={{ height: "44px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", position: "relative" }}>
            {/* dynamic island */}
            <div style={{ position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)", width: "88px", height: "24px", background: "#0a0a0a", borderRadius: "14px" }} />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#0a0a0a", zIndex: 1 }}>9:41</span>
            {/* signal + battery */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
                {[4, 6, 8, 10].map((h, i) => (
                  <div key={i} style={{ width: "3px", height: `${h}px`, background: "#0a0a0a", borderRadius: "1px", opacity: i < 3 ? 1 : 0.3 }} />
                ))}
              </div>
              <div style={{ width: "22px", height: "11px", border: "1.5px solid #0a0a0a", borderRadius: "3px", position: "relative" }}>
                <div style={{ position: "absolute", right: "-4px", top: "2.5px", width: "3px", height: "6px", background: "#0a0a0a", borderRadius: "0 2px 2px 0" }} />
                <div style={{ position: "absolute", inset: "1.5px 3px 1.5px 1.5px", background: "#0a0a0a", borderRadius: "1px" }} />
              </div>
            </div>
          </div>

          {/* app header */}
          <div style={{ padding: "6px 18px 10px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "9px", color: "#b0b0b0", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "2px" }}>
                Artwork Analysis
              </p>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                AXVELA AI
              </p>
            </div>
            {/* icon */}
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f2f2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="#888" strokeWidth="1.4"/>
                <path d="M4.5 6.5h4M6.5 4.5v4" stroke="#888" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* scrollable content */}
          <div style={{ background: "#f8f8f8", padding: "12px 10px 0" }}>

            {/* artwork image */}
            <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative", marginBottom: "10px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/Claude_Monet_-_Waterlilies_-_Nympheas_(1908).jpg"
                alt="Water Lilies — Claude Monet, 1908"
                style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 10px 8px", background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)" }}>
                <p style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.75)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Water Lilies · 1908
                </p>
              </div>
            </div>

            {/* chat area */}
            <div style={{ padding: "2px 2px 14px" }}>

              {/* user bubble */}
              <div style={{ opacity: showUser ? 1 : 0, transition: "opacity 0.3s ease", display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                <div style={{ background: "#0a0a0a", borderRadius: "16px 16px 3px 16px", padding: "8px 12px", maxWidth: "82%" }}>
                  <p style={{ fontSize: "11.5px", color: "#fff", lineHeight: 1.55, letterSpacing: "-0.005em" }}>
                    {typedText}
                    {phase === "typing" && (
                      <span className="cursor-blink" style={{ display: "inline-block", width: "1.5px", height: "11px", background: "rgba(255,255,255,0.8)", borderRadius: "1px", marginLeft: "2px", verticalAlign: "middle" }} />
                    )}
                  </p>
                </div>
              </div>

              {/* AI response */}
              <div style={{ opacity: showAI ? 1 : 0, transform: showAI ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.85s ease, transform 0.85s ease", display: "flex", gap: "7px", alignItems: "flex-start" }}>
                {/* avatar */}
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                  <span style={{ fontSize: "7px", fontWeight: 800, color: "#555", letterSpacing: "0.04em" }}>A</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "8.5px", color: "#aaa", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: "5px" }}>
                    AXVELA AI
                  </p>
                  <div style={{ background: "#fff", borderRadius: "3px 14px 14px 14px", padding: "10px 11px", border: "1px solid #efefef" }}>
                    {AI_PARAGRAPHS.map((para, i) => (
                      <p key={i} style={{ fontSize: "11px", color: "#2a2a2a", lineHeight: 1.72, marginBottom: i < AI_PARAGRAPHS.length - 1 ? "7px" : 0, letterSpacing: "-0.003em" }}>
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* home indicator */}
          <div style={{ height: "26px", background: "#f8f8f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "72px", height: "3px", background: "#0a0a0a", borderRadius: "2px", opacity: 0.12 }} />
          </div>

        </div>{/* /screen */}
      </div>{/* /frame */}
    </div>
  );
}

/* ─────────────────────────── hero ─────────────────────────── */

function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center px-6 pt-24 pb-20 max-w-6xl mx-auto">
      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-center">
        {/* Left — text + watermark logo */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          {/* Watermark logo — clipped strictly inside left column */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/axvela-logo.png"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "85%",
              maxWidth: "480px",
              opacity: 0.08,
              filter: "blur(3px) grayscale(1)",
              mixBlendMode: "multiply",
              pointerEvents: "none",
              userSelect: "none",
              objectFit: "contain",
              zIndex: 0,
            }}
          />

          {/* Content sits above the watermark */}
          <div style={{ position: "relative", zIndex: 1 }}>
          <FadeSection delay={0}>
            <Label>Cultural Intelligence</Label>
          </FadeSection>

          <FadeSection delay={120}>
            <h1 className="mt-8 text-5xl sm:text-6xl md:text-7xl font-light tracking-tight text-[#0a0a0a] leading-[1.05] text-balance">
              Art. Culture.
              <br />
              Intelligence.
            </h1>
          </FadeSection>

          <FadeSection delay={240}>
            <p className="mt-10 text-lg sm:text-xl text-[#6b6b6b] font-light leading-relaxed max-w-xl">
              AXVELA AI learns your aesthetic sensibility — and builds a cultural
              intelligence that grows with you.
            </p>
          </FadeSection>

          <FadeSection delay={360}>
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <a
                href="#experience"
                className="inline-block bg-[#0a0a0a] text-white text-[12px] tracking-[0.14em] uppercase px-8 py-4 hover:bg-[#333] transition-colors duration-300"
              >
                Explore AXVELA
              </a>
              <a
                href="#why"
                className="inline-block text-[#0a0a0a] text-[12px] tracking-[0.14em] uppercase px-8 py-4 border border-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors duration-300"
              >
                Learn more
              </a>
            </div>
          </FadeSection>
          </div>{/* end z-index content wrapper */}
        </div>{/* end left column */}

        {/* Right — phone mockup */}
        <FadeSection delay={200} className="flex justify-center">
          <PhoneCard />
        </FadeSection>
      </div>

      {/* Bottom stats — full width */}
      <FadeSection delay={480} className="mt-24 hidden md:block">
        <div className="grid grid-cols-3 gap-12 border-t border-[#e5e5e5] pt-10">
          {[
            ["Art & Exhibitions", "Track what you see. Build your history."],
            ["Taste Learning", "AI that understands your aesthetic."],
            ["Cultural Growth", "Insights that evolve with you."],
          ].map(([title, desc]) => (
            <div key={title}>
              <p className="text-[13px] font-medium text-[#0a0a0a]">{title}</p>
              <p className="mt-1 text-[13px] text-[#9a9a9a] leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </FadeSection>
    </section>
  );
}

/* ─────────────────────────── why axvela ─────────────────────────── */

function WhyCard({ number, title, body, delay }: { number: string; title: string; body: string; delay: number }) {
  const { ref, visible } = useFadeIn();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      <div
        className="bg-white p-10 h-full"
        style={{
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 12px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)"
            : "0 0 0 rgba(0,0,0,0)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          position: "relative",
          zIndex: hovered ? 1 : 0,
        }}
      >
        <span className="text-[10px] tracking-[0.2em] text-[#c8c8c8] font-medium">
          {number}
        </span>
        <h3 className="mt-5 text-[16px] font-medium text-[#0a0a0a] leading-snug tracking-[-0.01em]">
          {title}
        </h3>
        <div className="mt-3 w-6 h-px bg-[#e0e0e0]" />
        <p className="mt-4 text-[13.5px] text-[#6b6b6b] leading-[1.75]">
          {body}
        </p>
      </div>
    </div>
  );
}

function WhyAxvela() {
  const reasons = [
    {
      number: "01",
      title: "Built for culture",
      body: "AXVELA is designed for artworks, exhibitions, artists, and cultural context — not adapted from a general-purpose assistant.",
    },
    {
      number: "02",
      title: "Learning, not just retrieval",
      body: "It learns preference patterns, aesthetic signals, and behavior over time.",
    },
    {
      number: "03",
      title: "Personal and private",
      body: "Your cultural history remains yours. AXVELA builds intelligence around your experience, not ads.",
    },
    {
      number: "04",
      title: "Depth over breadth",
      body: "AXVELA prioritizes relevance, interpretation, and evolving understanding.",
    },
  ];

  return (
    <section id="why" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeSection>
          <Label>Why AXVELA</Label>
        </FadeSection>

        <FadeSection delay={100}>
          <h2 className="mt-8 text-4xl md:text-5xl font-light text-[#0a0a0a] tracking-tight max-w-2xl leading-tight">
            Intelligence that understands culture deeply.
          </h2>
        </FadeSection>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-px bg-[#e5e5e5]">
          {reasons.map((r, i) => (
            <WhyCard key={r.number} {...r} delay={120 + i * 90} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── experience → grow ─────────────────────────── */

const FLOW_STEPS = [
  { num: "01", word: "Experience", desc: "User explores artworks, exhibitions, and culture." },
  { num: "02", word: "Record",     desc: "AXVELA captures preferences, interactions, and context." },
  { num: "03", word: "Learn",      desc: "The system refines understanding using behavioral and aesthetic signals." },
  { num: "04", word: "Grow",       desc: "AXVELA delivers deeper, more relevant cultural insight over time." },
];

function ExperienceGrow() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(1);
          setTimeout(() => setRevealed(2), 600);
          setTimeout(() => setRevealed(3), 1200);
          setTimeout(() => setRevealed(4), 1800);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /*
    Line spans from the center of column 1 to the center of column 4.
    With grid-cols-4 and gap-8 (2rem each, 3 gaps = 6rem total):
      column width  = (100% − 6rem) / 4
      col 1 center  = col_w / 2           = (100% − 6rem) / 8   from left
      col 4 center  = same distance       = (100% − 6rem) / 8   from right

    Progressive draw: scaleX 0 → 1/3 → 2/3 → 1, origin left.
  */
  const lineScale =
    revealed <= 1 ? 0 :
    revealed === 2 ? 1 / 3 :
    revealed === 3 ? 2 / 3 : 1;

  return (
    <section id="experience" className="py-32 px-6 bg-[#fafafa]">
      <div className="max-w-6xl mx-auto">
        <FadeSection><Label>How it works</Label></FadeSection>
        <FadeSection delay={100}>
          <h2 className="mt-8 text-4xl md:text-5xl font-light text-[#0a0a0a] tracking-tight max-w-xl leading-tight">
            A loop that never stops learning.
          </h2>
        </FadeSection>

        <div ref={sectionRef} className="mt-20">

          {/* ── Desktop ── */}
          <div className="hidden md:block">

            {/* Dots row — same grid as text below, guarantees pixel-perfect alignment */}
            <div className="relative mb-9" style={{ height: "8px" }}>

              {/* Base track: left/right anchored to column centers via the same gap math */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "calc((100% - 6rem) / 8)",
                  right: "calc((100% - 6rem) / 8)",
                  height: "1px",
                  background: "#e8e8e8",
                  transform: "translateY(-50%)",
                }}
              />

              {/* Progressive fill — scaleX from left */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "calc((100% - 6rem) / 8)",
                  right: "calc((100% - 6rem) / 8)",
                  height: "1px",
                  background: "#1a1a1a",
                  transform: `translateY(-50%) scaleX(${lineScale})`,
                  transformOrigin: "left center",
                  transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />

              {/* Dots — each centered inside its grid column */}
              <div className="grid grid-cols-4 gap-8 h-full">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-center items-center">
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: revealed > i ? "#0a0a0a" : "#dedede",
                        transition: "background 0.4s ease",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Step text — same grid columns, dots above are perfectly centered */}
            <div className="grid grid-cols-4 gap-8">
              {FLOW_STEPS.map((step, i) => (
                <div
                  key={step.num}
                  style={{
                    opacity: revealed > i ? 1 : 0,
                    transform: revealed > i ? "translateY(0)" : "translateY(12px)",
                    transition: "opacity 0.75s ease, transform 0.75s ease",
                  }}
                >
                  <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#c8c8c8", fontWeight: 500 }}>
                    {step.num}
                  </span>
                  <h3 style={{ marginTop: "14px", fontSize: "17px", fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                    {step.word}
                  </h3>
                  <div style={{ marginTop: "10px", width: "24px", height: "1px", background: "#d8d8d8" }} />
                  <p style={{ marginTop: "10px", fontSize: "13px", color: "#6b6b6b", lineHeight: 1.8 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Mobile: vertical timeline ── */}
          <div className="md:hidden pl-5 border-l border-[#e8e8e8] space-y-12">
            {FLOW_STEPS.map((step, i) => (
              <FadeSection key={step.num} delay={i * 120}>
                <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#c8c8c8", fontWeight: 500 }}>
                  {step.num}
                </span>
                <h3 className="mt-3 text-[16px] font-medium text-[#0a0a0a] tracking-tight">{step.word}</h3>
                <p className="mt-2 text-[13px] text-[#6b6b6b] leading-relaxed">{step.desc}</p>
              </FadeSection>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── technology ─────────────────────────── */

function TechLayer({
  pillar,
  index,
  revealed,
}: {
  pillar: { label: string; title: string; body: string };
  index: number;
  revealed: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    /* Outer shell — handles the reveal animation */
    <div
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(10px)",
        transition: `opacity 0.8s ease, transform 0.8s ease`,
      }}
    >
      {/* Inner shell — handles hover lift */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          paddingLeft: "28px",
          paddingTop: "26px",
          paddingBottom: "26px",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          transition: "transform 0.45s ease, box-shadow 0.45s ease",
          boxShadow: hovered
            ? "0 8px 28px rgba(0,0,0,0.06)"
            : "0 0 0 rgba(0,0,0,0)",
          cursor: "default",
        }}
      >
        {/* Accent line — sits on the continuous track, darkens on hover */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "1px",
            background: hovered ? "#0a0a0a" : "transparent",
            transition: "background 0.45s ease",
          }}
        />

        {/* Layer index */}
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.2em",
            color: "#c4c4c4",
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pillar.label}
        </span>

        {/* Title */}
        <h3
          style={{
            marginTop: "13px",
            fontSize: "16px",
            fontWeight: 500,
            color: "#0a0a0a",
            letterSpacing: "-0.015em",
            lineHeight: 1.3,
          }}
        >
          {pillar.title}
        </h3>

        {/* Separator */}
        <div
          style={{
            marginTop: "12px",
            width: "20px",
            height: "1px",
            background: hovered ? "#b0b0b0" : "#e0e0e0",
            transition: "background 0.45s ease",
          }}
        />

        {/* Body */}
        <p
          style={{
            marginTop: "12px",
            fontSize: "13px",
            color: "#6b6b6b",
            lineHeight: 1.85,
          }}
        >
          {pillar.body}
        </p>
      </div>
    </div>
  );
}

function Technology() {
  const pillars = [
    {
      label: "Layer 01",
      title: "Contextual Understanding",
      body: "AXVELA reads cultural context — not just metadata. It understands art movements, historical periods, and stylistic relationships.",
    },
    {
      label: "Layer 02",
      title: "Adaptive Taste Modeling",
      body: "Every interaction refines your taste profile. The model adapts continuously as your cultural engagement evolves.",
    },
    {
      label: "Layer 03",
      title: "Multimodal Intelligence",
      body: "Images, text, and behavioral signals combine into a unified understanding of what resonates with you.",
    },
  ];

  const rightRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(1);
          setTimeout(() => setRevealed(2), 260);
          setTimeout(() => setRevealed(3), 520);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="technology" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">

          {/* Left — unchanged */}
          <div>
            <FadeSection>
              <Label>Technology</Label>
            </FadeSection>
            <FadeSection delay={100}>
              <h2 className="mt-8 text-4xl md:text-5xl font-light text-[#0a0a0a] tracking-tight leading-tight">
                AI built for the
                <br />
                complexity of culture.
              </h2>
            </FadeSection>
            <FadeSection delay={200}>
              <p className="mt-8 text-[15px] text-[#6b6b6b] leading-relaxed max-w-sm">
                Culture is layered, subjective, and deeply personal. AXVELA&apos;s
                architecture is designed to hold that complexity — not reduce it.
              </p>
            </FadeSection>
          </div>

          {/* Right — intelligence layer stack */}
          <div ref={rightRef} style={{ position: "relative" }}>
            {/* Continuous vertical track behind all layers */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "1px",
                background: "#ebebeb",
              }}
            />

            {/* Soft dividers between items */}
            {pillars.map((p, i) => (
              <div key={p.label}>
                <TechLayer pillar={p} index={i} revealed={revealed > i} />
                {i < pillars.length - 1 && (
                  <div
                    style={{
                      marginLeft: "28px",
                      height: "1px",
                      background: "#f0f0f0",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── about artxpark ─────────────────────────── */

function AboutArtXpark() {
  return (
    <section id="artxpark" className="py-32 px-6 bg-[#0a0a0a] relative overflow-hidden">

      {/* Background logo — soft watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/ArtXpark-logo-black.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "65%",
          maxWidth: "640px",
          opacity: 0.31,
          /*
            1. invert(1)  — flips black→white, white→black
            2. blur(8px)  — softens edges so the remaining dark halo dissolves
            mix-blend-mode: screen — the near-black "background" of the inverted
            image blends away against the dark section; only the white logo mark
            remains as a faint luminous presence.
          */
          filter: "invert(1) blur(8px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          userSelect: "none",
          objectFit: "contain",
        }}
      />

      <div className="max-w-6xl mx-auto relative">{/* relative so text sits above the logo */}
        <FadeSection>
          <Label>
            <span className="text-[#555]">About</span>
          </Label>
        </FadeSection>

        <FadeSection delay={100}>
          <h2 className="mt-8 text-4xl md:text-5xl font-light text-white tracking-tight max-w-2xl leading-tight">
            AXVELA AI is built by ArtXpark.
          </h2>
        </FadeSection>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16">
          <FadeSection delay={150}>
            <p className="text-[15px] text-[#888] leading-relaxed">
              ArtXpark is a technology company at the intersection of art,
              culture, and artificial intelligence. We believe that cultural
              engagement should be meaningful, intelligent, and deeply personal.
            </p>
            <p className="mt-5 text-[15px] text-[#888] leading-relaxed">
              AXVELA AI is our core product — a platform that transforms how
              people discover, record, and grow through culture.
            </p>
          </FadeSection>

          <FadeSection delay={250}>
            <div className="space-y-8">
              {[
                ["Mission", "Build intelligence that honors the depth of human culture."],
                ["Vision", "A world where cultural engagement compounds into genuine wisdom."],
                ["Based in", "Seoul, Korea — with a global perspective."],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-[#222] pt-6">
                  <span className="text-[11px] tracking-widest text-[#444] uppercase">
                    {label}
                  </span>
                  <p className="mt-2 text-[14px] text-[#ccc] leading-relaxed">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </FadeSection>
        </div>
      </div>{/* /relative inner */}
    </section>
  );
}

/* ─────────────────────────── team ─────────────────────────── */

function AdvisoryCard({
  name,
  role,
  background,
  bullets,
  arrow,
}: {
  name: string;
  role: string;
  background: string[];
  bullets: string[];
  arrow: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        paddingLeft: "28px",
        paddingTop: "28px",
        paddingBottom: "28px",
        paddingRight: "8px",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.06)" : "none",
        transition: "transform 0.4s ease, box-shadow 0.4s ease",
        cursor: "default",
      }}
    >
      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "1px",
          background: hovered ? "#0a0a0a" : "transparent",
          transition: "background 0.4s ease",
        }}
      />

      <h3 style={{ fontSize: "15px", fontWeight: 500, color: "#0a0a0a", letterSpacing: "-0.01em" }}>
        {name}
      </h3>
      <p style={{ marginTop: "4px", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a9a9a" }}>
        {role}
      </p>

      <div style={{ marginTop: "18px" }}>
        <span style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#c4c4c4", fontWeight: 500 }}>
          Background
        </span>
        <ul style={{ marginTop: "8px" }}>
          {background.map((b) => (
            <li key={b} style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
              <span style={{ color: "#d0d0d0", flexShrink: 0 }}>·</span>
              <span style={{ fontSize: "12px", color: "#5a5a5a", lineHeight: 1.6 }}>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {bullets.length > 0 && (
        <ul style={{ marginTop: "12px" }}>
          {bullets.map((b) => (
            <li key={b} style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
              <span style={{ color: "#d0d0d0", flexShrink: 0 }}>·</span>
              <span style={{ fontSize: "12px", color: "#6b6b6b", lineHeight: 1.6 }}>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          marginTop: "18px",
          paddingTop: "14px",
          borderTop: `1px solid ${hovered ? "#dedede" : "#f0f0f0"}`,
          display: "flex",
          gap: "8px",
          alignItems: "flex-start",
          transition: "border-color 0.4s ease",
        }}
      >
        <span style={{ color: "#b4b4b4", flexShrink: 0 }}>→</span>
        <p style={{ fontSize: "12px", color: "#3a3a3a", lineHeight: 1.65 }}>{arrow}</p>
      </div>
    </div>
  );
}

function Team() {
  const founderItems = [
    "UOVO Art (USA) — Art Handling / Transport",
    "JN Gallery — Exhibition Planning / Sales",
    "Opera Gallery Korea — Curating",
  ];

  const aiBackground = [
    "Bachelor's Degree — Computer Science",
    "Harvard University — M.S. in Epidemiology",
    "MIT — Artificial Intelligence Program",
    "Harvard University — Ph.D. in Population Health",
  ];

  const aiBullets = [
    "PhD-level expertise in AI, multimodal systems, and data-driven modeling",
    "Designs the learning-driven architecture of AXVELA",
    "Leads the development of cultural intelligence systems and AI agents",
  ];

  const marketInsight = [
    "Repeatedly experienced in the field that artwork condition, provenance, and transaction data are not structurally connected as data",
    "Directly observed that lack of data simultaneously reduces pricing accuracy, trust, and transaction efficiency",
  ];

  const founderFit = [
    "End-to-end experience across logistics → exhibition → sales",
    "Founder who has directly experienced data-related problems within the market",
    "Problems are not abstract assumptions, but validated through real operational experience",
  ];

  const advisors = [
    {
      name: "Jung Young-hoon",
      role: "IP Strategy Advisor",
      background: [
        "Seoul National University — Engineering",
        "Representative Patent Attorney, Jaram Patent Office",
      ],
      bullets: [
        "System-level patent strategy",
        "FTO analysis / global IP strategy",
      ],
      arrow: "Designs an IP structure that enables defensible and scalable infrastructure",
    },
    {
      name: "Kim Wook-jun",
      role: "Legal Advisor",
      background: [
        "Seoul National University — Law",
        "Kim & Chang Attorney / New York Bar",
        "Former Prosecutor, Seoul Central District Prosecutors' Office",
      ],
      bullets: [],
      arrow: "Builds a legal structure that proactively removes risks during scaling",
    },
    {
      name: "Lee Bok-hyun",
      role: "Regulatory & Finance Advisor",
      background: [
        "Seoul National University — Economics",
        "Attorney / CPA / California Bar",
        "Former Governor, Financial Supervisory Service",
      ],
      bullets: ["AML / KYC / RWA — financial regulation expertise"],
      arrow: "Plays a key role in building trust structures for institutional expansion",
    },
  ];

  return (
    <section id="team" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <FadeSection>
          <Label>Founder & Team</Label>
        </FadeSection>
        <FadeSection delay={100}>
          <h2 className="mt-8 text-4xl md:text-5xl font-light text-[#0a0a0a] tracking-tight leading-tight">
            Leadership
          </h2>
        </FadeSection>

        {/* Main grid */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">

          {/* Left — Founder + AI Lead */}
          <div>

            {/* ── CEO & Founder ── */}
            <FadeSection>
              <Label>CEO & Founder</Label>
            </FadeSection>

            <FadeSection delay={120}>
              <blockquote
                style={{
                  marginTop: "20px",
                  paddingLeft: "16px",
                  borderLeft: "1px solid #e0e0e0",
                  fontSize: "14px",
                  color: "#7a7a7a",
                  fontStyle: "italic",
                  lineHeight: 1.75,
                }}
              >
                "A founder who has experienced the reality of data-less operations in the field"
              </blockquote>
            </FadeSection>

            <FadeSection delay={220}>
              <div style={{ marginTop: "28px" }}>
                <h3 style={{ fontSize: "22px", fontWeight: 300, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                  Jinhwi Park
                </h3>
                <p style={{ marginTop: "5px", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a9a9a" }}>
                  Founder & CEO, ArtXpark Inc.
                </p>
              </div>
            </FadeSection>

            <FadeSection delay={320}>
              <div style={{ marginTop: "24px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#c4c4c4", fontWeight: 500 }}>
                  Academic Background
                </span>
                <p style={{ marginTop: "10px", fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6 }}>
                  University of Northern Colorado — Art History
                </p>
              </div>
            </FadeSection>

            <FadeSection delay={400}>
              <div style={{ marginTop: "20px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#c4c4c4", fontWeight: 500 }}>
                  Professional Experience
                </span>
                <ul style={{ marginTop: "10px" }}>
                  {founderItems.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "10px", marginTop: "7px" }}>
                      <span style={{ color: "#d0d0d0", flexShrink: 0 }}>—</span>
                      <span style={{ fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeSection>

            {/* Divider */}
            <FadeSection delay={480}>
              <div style={{ margin: "40px 0", height: "1px", background: "#ebebeb" }} />
            </FadeSection>

            {/* ── AI & Systems Lead ── */}
            <FadeSection delay={520}>
              <Label>AI & Systems Lead</Label>
            </FadeSection>

            <FadeSection delay={620}>
              <div style={{ marginTop: "20px" }}>
                <h3 style={{ fontSize: "22px", fontWeight: 300, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                  Dr. Seo Young-sang
                </h3>
                <p style={{ marginTop: "5px", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a9a9a" }}>
                  AI & Systems Architect
                </p>
              </div>
            </FadeSection>

            <FadeSection delay={700}>
              <div style={{ marginTop: "24px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#c4c4c4", fontWeight: 500 }}>
                  Academic Background
                </span>
                <ul style={{ marginTop: "10px" }}>
                  {aiBackground.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "10px", marginTop: "7px" }}>
                      <span style={{ color: "#d0d0d0", flexShrink: 0 }}>—</span>
                      <span style={{ fontSize: "13px", color: "#4a4a4a", lineHeight: 1.6 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeSection>

            <FadeSection delay={780}>
              <ul style={{ marginTop: "18px" }}>
                {aiBullets.map((item) => (
                  <li key={item} style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    <span style={{ color: "#d0d0d0", flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.75 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </FadeSection>

            <FadeSection delay={840}>
              <div style={{ marginTop: "20px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ color: "#b4b4b4", flexShrink: 0 }}>→</span>
                <p style={{ fontSize: "13px", color: "#0a0a0a", fontWeight: 500, lineHeight: 1.6 }}>
                  Builds the core intelligence layer that powers AXVELA
                </p>
              </div>
            </FadeSection>
          </div>

          {/* Right — Narrative */}
          <div>

            <FadeSection delay={160}>
              <div>
                <Label>Market Insight — Problem Recognition</Label>
                <ul style={{ marginTop: "20px" }}>
                  {marketInsight.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
                      <span style={{ color: "#d0d0d0", flexShrink: 0, marginTop: "2px" }}>·</span>
                      <span style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.8 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeSection>

            <FadeSection delay={300}>
              <div style={{ margin: "36px 0", height: "1px", background: "#ebebeb" }} />
            </FadeSection>

            <FadeSection delay={400}>
              <div>
                <Label>Founder–Market Fit</Label>
                <ul style={{ marginTop: "20px" }}>
                  {founderFit.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
                      <span style={{ color: "#d0d0d0", flexShrink: 0, marginTop: "2px" }}>·</span>
                      <span style={{ fontSize: "13px", color: "#6b6b6b", lineHeight: 1.8 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeSection>
          </div>
        </div>

        {/* Advisory Board */}
        <FadeSection delay={0}>
          <div style={{ marginTop: "80px", paddingTop: "56px", borderTop: "1px solid #ebebeb" }}>
            <Label>Strategic Advisory Board</Label>

            {/* Continuous vertical track behind cards */}
            <div style={{ position: "relative", marginTop: "36px" }}>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "#ebebeb",
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3">
                {advisors.map((advisor, i) => (
                  <div key={advisor.name}>
                    <FadeSection delay={i * 140}>
                      <AdvisoryCard {...advisor} />
                    </FadeSection>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeSection>

      </div>
    </section>
  );
}

/* ─────────────────────────── footer ─────────────────────────── */

function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-[#e5e5e5]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <span className="text-[12px] tracking-[0.18em] uppercase font-semibold text-[#0a0a0a]">
          AXVELA AI
        </span>
        <div className="flex gap-8">
          {["Why AXVELA", "Technology", "ArtXpark", "Team"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, "")}`}
              className="text-[11px] tracking-wider uppercase text-[#9a9a9a] hover:text-[#0a0a0a] transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>
        <span className="text-[11px] text-[#c0c0c0]">
          © {new Date().getFullYear()} ArtXpark. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

/* ─────────────────────────── page ─────────────────────────── */

export default function Home() {
  return (
    <main>
      <Nav>
      </Nav>
      <Hero />
      <Divider />
      <WhyAxvela />
      <Divider />
      <ExperienceGrow />
      <Divider />
      <Technology />
      <AboutArtXpark />
      <Team />
      <Footer />
    </main>
  );
}
