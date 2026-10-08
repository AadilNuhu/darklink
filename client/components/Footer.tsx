import React from 'react'

const Footer = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-2 py-6 md:py-8 px-4 md:px-8 bg-black border-t border-gray-600 text-white text-[10px]">
      <div className="text-[#00ff66]">
        © 2026 DARKLINK
      </div>

      <div className="text-gray-400 md:text-left">
        NOT EVERY CONVERSATION NEEDS A RECORD.
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-[#00ff66]"></div>
        <span>darklink / v.0.1.0</span>
      </div>
    </div>
  )
}

export default Footer