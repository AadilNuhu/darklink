import React from 'react'

const LandingPage = () => {
    return (
        <div className='py-8 px-4 bg-black text-white min-h-screen'>
            {/* left column */}
            <div>
                <div className='flex items-center gap-1 text-[10px] text-[#00ff66]'><div className="h-1 w-1 rounded-full bg-[#00ff66]"></div>PRIVATE BY DESIGN. EPHEMERAL BY DEFAULT.</div>
                <div className='text-6xl'>Talk freely.</div>
                <div className='text-6xl '>Leave nothing behind.</div>
                <div>
                    <p>A room. A link. A conversation.</p>
                    <p>Encrypted text sessions that disappear when you’re done.</p>
                    <p>No accounts. No footprints. No looking back.</p>
                </div>
            </div>
            {/* right column */}
        </div>
    )
}

export default LandingPage