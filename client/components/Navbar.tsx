import React from 'react'
import { Link2 } from 'lucide-react'

const Navbar = () => {
  return (
      <nav className='flex justify-between items-center py-8 px-4 bg-black border-b border-gray-600 text-white'>
        <div className='flex gap-1 font-bold'><Link2 className="h-6 w-6 text-[#00ff66] rotate-[-16deg]" />dark<span className='text-[#00ff66] ml-[-2]'>link</span></div>
        <div className='flex gap-4 text-sm text-gray-400'>
          <div>Overview</div>
          <div>The protocol</div>
        </div>
        <div className='flex items-center gap-2 text-[10px] font-bold text-[#00ff66]'><div className='h-1 w-1 rounded-full bg-[#00ff66]'></div>SYSTEM OPERATIONAL</div>
      </nav>
  )
}

export default Navbar