import React from 'react'

const Footer = () => {
  return (
    <div className='flex justify-between gap-2 py-8 px-4 bg-black border-t border-gray-600 text-white text-[10px]'>
      <div className='text-[#00ff66]'>© 2026 DARKLINK</div>
      <div className='text-gray-400'>NOT EVERY CONVERSATION NEEDS A RECORD.</div>
      <div className='flex items-center gap-2'><div className='h-1 w-1 rounded-full bg-[#00ff66]'></div>darklink / v.0.1.0</div>
    </div>
  )
}

export default Footer