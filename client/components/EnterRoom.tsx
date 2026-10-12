"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"

type Modal = { onClose: () => void }

const CODE_LENGTH = 8

const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-gray-100 " +
    "placeholder:text-white/25 outline-none transition hover:border-white/20 " +
    "focus:border-[#00ff66]/70 focus:bg-[#00ff66]/[0.04] focus:shadow-[0_0_0_3px_rgba(0,255,102,0.12)]"

const labelCls = "mb-1.5 block text-xs font-medium text-white/70"

const EnterRoom = ({ onClose }: Modal) => {
    const [code, setCode] = useState("")
    const [username, setUsername] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("keydown", onKey)
            clearTimeout(timer.current)
        }
    }, [onClose])

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (code.length !== CODE_LENGTH) {
            setError(`Enter the ${CODE_LENGTH}-character room code.`)
            return
        }
        if (!username.trim()) {
            setError("Choose a username to join.")
            return
        }
        setError("")
        setIsLoading(true)
        setSuccess("Code accepted. Joining...")
        console.log("Joining room:", { code, username })
        // TODO: replace with your real join call
        timer.current = setTimeout(onClose, 1500)
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-md
                bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,255,102,0.14),transparent_60%),rgba(2,4,3,0.85)]"
            onMouseDown={e => e.target === e.currentTarget && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="enter-room-title"
                className="er-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#080b09] p-6
                    shadow-[0_0_90px_-25px_rgba(0,255,102,0.45),0_30px_60px_-20px_rgba(0,0,0,0.9)]"
                style={{ animation: "er-in .3s cubic-bezier(.2,.8,.2,1) both" }}
            >
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 id="enter-room-title" className="text-xl font-semibold tracking-tight text-white">
                            Enter a room
                        </h2>
                        <p className="mt-1 text-sm text-white/50">Use the code someone shared with you.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-white/40 transition hover:bg-red-500 cursor-pointer hover:text-white
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff66]/60"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    {success && (
                        <div role="status" className="mb-4 rounded-lg border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-2 text-xs text-[#6dffa6]">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                            {error}
                        </div>
                    )}

                    <label htmlFor="code" className={labelCls}>Room code</label>
                    <input
                        id="code"
                        type="text"
                        value={code}
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={CODE_LENGTH}
                        placeholder="B67H9IS0"
                        onChange={e => {
                            setError("")
                            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                        }}
                        className={`${inputCls} mb-4 text-center font-mono text-lg font-semibold tracking-[0.35em] text-[#6dffa6]`}
                    />

                    <label htmlFor="username" className={labelCls}>Username</label>
                    <div className="relative mb-5">
                        <input
                            id="username"
                            type="text"
                            value={username}
                            autoComplete="off"
                            placeholder="anonymous"
                            onChange={e => {
                                setError("")
                                setUsername(e.target.value)
                            }}
                            className={`${inputCls} pl-4 font-mono`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00ff66] py-3 font-semibold text-black
                            shadow-[0_0_30px_-6px_rgba(0,255,102,0.7)] transition
                            hover:bg-[#33ff85] hover:shadow-[0_0_40px_-4px_rgba(0,255,102,0.9)] active:scale-[0.99]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                            disabled:cursor-wait disabled:opacity-80 cursor-pointer"
                    >
                        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Joining...</> : "Join room"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default EnterRoom