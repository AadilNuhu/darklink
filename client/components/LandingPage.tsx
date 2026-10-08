import Image from "next/image";
import img from "@/public/darkimage.jpg";
import PrincipleSection from "./PrincipleSection";
import Manifesto from "./Manifesto";

const LandingPage = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background image */}
      <div className=" inset-y-0 right-0 w-full md:w-[52%]">
        <Image
          src={img}
          alt="Dark background"
          fill
          priority
          className="object-cover opacity-30 md:opacity-45"
        />

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      </div>

      {/* Green ambient glow */}
      <div className="absolute right-[10%] top-[25%] h-64 w-64 rounded-full bg-[#00ff66]/10 blur-[120px]" />

      {/* Content */}
      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-3xl">
          {/* Status */}
          <div className="mb-7 flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-[#00ff66] sm:text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff66] shadow-[0_0_10px_#00ff66]" />
            PRIVATE BY DESIGN. EPHEMERAL BY DEFAULT.
          </div>

          {/* Heading */}
          <h1 className="font-mono text-4xl font-medium leading-[0.95] tracking-[-0.04em] sm:text-5xl md:text-6xl lg:text-7xl">
            Talk freely.
            <br />
            <span className="text-white/45">
              Leave nothing behind.
            </span>
          </h1>

          {/* Description */}
          <div className="mt-8 max-w-xl border-l border-[#00ff66]/30 pl-5 font-mono text-sm leading-7 text-white/55 sm:text-base">
            <p>A room. A link. A conversation.</p>
            <p>
              Encrypted text sessions that disappear when you&apos;re done.
            </p>
            <p className="text-white/35">
              No accounts. No footprints. No looking back.
            </p>
          </div>

          {/* CTA area */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button className="group relative overflow-hidden border border-[#00ff66]/60 bg-[#00ff66] px-7 py-3 font-mono text-xs font-bold tracking-widest text-black transition-all duration-300 hover:bg-[#00ff66]/90 hover:shadow-[0_0_30px_rgba(0,255,102,0.2)]">
              CREATE A ROOM
            </button>

            <button className="border border-white/10 bg-white/[0.03] px-7 py-3 font-mono text-xs tracking-widest text-white/60 backdrop-blur-sm transition hover:border-white/20 hover:text-white">
              ENTER A ROOM
            </button>
          </div>

          {/* Encryption indicator */}
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] tracking-widest text-white/25">
            <span>● NO SAVED HISTORY</span>
            <span>● NO SIGN-UP REQUIRED</span>
            <span>● JUST TEXT</span>
          </div>
        </div>
      </section>

      {/* Bottom terminal line */}
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between border-t border-white/[0.06] pt-3 font-mono text-[8px] tracking-widest text-white/20 sm:left-8 sm:right-8">
        <span>SESSION // 001</span>
        <span>SECURE CHANNEL</span>
      </div>

      {/* ========== principle section ========== */}
      <PrincipleSection />

      {/* ========== principle section ========== */}
       <Manifesto /> 
    </main>
  );
};

export default LandingPage;