'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Link2, ShieldCheck } from 'lucide-react'

const Navbar = () => {
  const pathname = usePathname()
  const isTermsActive = pathname === '/terms' || pathname === '/terms-and-conditions'

  return (
    <nav className='flex justify-between items-center py-6 px-4 md:px-8 bg-black/95 backdrop-blur-md border-b border-white/10 text-white sticky top-0 z-40'>
      <Link
        href="/"
        className='flex items-center gap-1 font-bold text-base sm:text-lg tracking-tight hover:opacity-85 transition-opacity'
        title="Darklynk — Private, temporary conversations"
      >
        <Link2 className="h-5 w-5 sm:h-6 sm:w-6 text-[#00ff66] rotate-[-16deg]" />
        <span>dark<span className='text-[#00ff66]'>lynk</span></span>
      </Link>

      <div className='flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-mono'>
        <Link
          href="/terms"
          className={`flex items-center gap-1.5 transition-all duration-200 px-3 py-1.5 rounded-md ${
            isTermsActive
              ? 'text-[#00ff66] bg-[#00ff66]/10 border border-[#00ff66]/30'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          title="Terms and Conditions"
        >
          <ShieldCheck className="h-3.5 w-3.5 opacity-80" />
          <span>Terms & Conditions</span>
        </Link>
      </div>

      <div className='flex items-center gap-2 text-[10px] sm:text-xs font-mono font-bold text-[#00ff66]'>
        <span className='relative flex h-2 w-2'>
          <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff66] opacity-75'></span>
          <span className='relative inline-flex rounded-full h-2 w-2 bg-[#00ff66] shadow-[0_0_8px_#00ff66]'></span>
        </span>
        <span className="hidden sm:inline">SYSTEM OPERATIONAL</span>
        <span className="sm:hidden">OPERATIONAL</span>
      </div>
    </nav>
  )
}

export default Navbar