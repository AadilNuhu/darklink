'use client'
import Image from "next/image";
import img from "@/public/darkimage.jpg";
import PrincipleSection from "./PrincipleSection";
import Manifesto from "./Manifesto";
import CreateRoom from "./CreateRoom";
import EnterRoom from "./EnterRoom";
import { useState } from "react";

const LandingPage = () => {
  const [showCreateRoom, setShowCreateRoom] = useState<boolean>(false)
  const [showEnterRoom, setShowEnterRoom] = useState<boolean>(false)
  return (
    <main className="relative overflow-hidden bg-black text-white">
      <section id="top" className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={img}
          alt="Dark background"
          fill
          priority
          className="object-cover object-center opacity-25 md:object-[65%_center] md:opacity-40"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      </div>

      <div className="pointer-events-none absolute right-[10%] top-[25%] h-64 w-64 rounded-full bg-[#00ff66]/10 blur-[120px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
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
            <button className="group relative min-h-12 cursor-pointer rounded-lg border border-[#00ff66]/60 bg-[#00ff66] px-7 py-3 font-mono text-xs font-bold tracking-widest text-black transition-all duration-300 hover:bg-[#00ff66]/90 hover:shadow-[0_0_30px_rgba(0,255,102,0.2)] sm:min-w-48" onClick={() => setShowCreateRoom(true)} >
             CREATE A ROOM
            </button>

            <button className="min-h-12 cursor-pointer rounded-lg border border-white/15 bg-white/[0.04] px-7 py-3 font-mono text-xs tracking-widest text-white/75 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white sm:min-w-48" onClick={() => setShowEnterRoom(true)}>
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
      </div>

      <div className="pointer-events-none absolute bottom-4 left-5 right-5 flex items-center justify-between border-t border-white/[0.08] pt-3 font-mono text-[8px] tracking-widest text-white/30 sm:left-8 sm:right-8">
        <span>SESSION // 001</span>
        <span>SECURE CHANNEL</span>
      </div>
      </section>
      {showCreateRoom && ( <CreateRoom onClose={() => setShowCreateRoom(false)} />)}
      {showEnterRoom && ( <EnterRoom onClose={() => setShowEnterRoom(false)} />)}

      {/* ========== principle section ========== */}
      <PrincipleSection />

      {/* ========== principle section ========== */}
       <Manifesto /> 
    </main>
  );
};

export default LandingPage;