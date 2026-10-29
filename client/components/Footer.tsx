import React from 'react'
import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-2 py-6 md:py-8 px-4 md:px-8 bg-black border-t border-white/10 text-white text-[10px] font-mono">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[#00ff66] font-bold">© 2026 DARKLYNK</span>
        <span className="text-white/20">•</span>
        <Link
          href="/terms"
          className="text-gray-400 hover:text-[#00ff66] transition-colors underline-offset-4 hover:underline"
        >
          TERMS & CONDITIONS
        </Link>
      </div>

      <div className="text-gray-400 md:text-left tracking-widest text-[9px] sm:text-[10px]">
        NOT EVERY CONVERSATION NEEDS A RECORD.
      </div>

      <div className="flex items-center gap-2 text-white/50">
        <div className="h-1.5 w-1.5 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66]"></div>
        <span>darklynk / v.0.1.0</span>
      </div>
    </footer>
  )
}

export default Footer