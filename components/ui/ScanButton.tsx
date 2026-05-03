'use client';

type Props = {
  onClick?: () => void;
  ariaLabel?: string;
};

export default function ScanButton({ onClick, ariaLabel = '스캔 시작' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative h-[208px] w-[208px] rounded-full
                 bg-gradient-to-b from-white/[0.07] to-white/[0.015]
                 ring-1 ring-white/10
                 shadow-[0_0_80px_-20px_rgba(180,180,220,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
                 transition duration-300 active:scale-[0.97]"
    >
      {/* Outer halo — soft luminous wash */}
      <span
        aria-hidden
        className="absolute -inset-6 rounded-full
                   bg-[radial-gradient(circle,rgba(180,180,220,0.18)_0%,rgba(0,0,0,0)_60%)]
                   blur-2xl"
      />

      {/* Inner hairline ring */}
      <span aria-hidden className="absolute inset-3 rounded-full ring-1 ring-white/[0.04]" />

      {/* Scan reticle — 4 corner brackets, viewfinder metaphor */}
      <span className="relative flex h-full w-full items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-12 w-12 text-white/55" fill="none">
          <path d="M4 13 V5 H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <path d="M28 5 H36 V13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <path d="M36 27 V35 H28" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <path d="M12 35 H4 V27" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  );
}
