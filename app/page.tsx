import ScanButton from '@/components/ui/ScanButton';
import MainInputBar from '@/components/layout/MainInputBar';

export default function Home() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#070708] text-white">
      {/* Premium dark gradient backdrop —
          top halo (cool gray) + bottom violet wash + base fade */}
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
        {/* Top — wordmark */}
        <header className="px-6 pt-[calc(env(safe-area-inset-top)+24px)]">
          <div className="text-center text-[11px] font-light text-white/40">
            <span className="tracking-[0.32em]">AXVELA</span>
            <span className="ml-1 tracking-normal text-white/30">(엑스벨라)</span>
          </div>
        </header>

        {/* Center — Scan CTA + caption */}
        <section className="flex flex-1 flex-col items-center justify-center px-6">
          <ScanButton />

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

        {/* Bottom — input bar */}
        <footer className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <MainInputBar />
        </footer>
      </div>
    </main>
  );
}
