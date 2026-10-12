import { ShieldAlert, X, Minus, Plus, Timer, Users, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import GeneratedCode from "./GeneratedCode"

const DURATIONS = [
    { value: "15", label: "15 min" },
    { value: "30", label: "30 min" },
    { value: "60", label: "1 hour" },
]
const MIN_USERS = 2
const MAX_USERS = 20

const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-gray-100 " +
    "placeholder:text-white/25 outline-none transition hover:border-white/20 " +
    "focus:border-[#00ff66]/70 focus:bg-[#00ff66]/[0.04] focus:shadow-[0_0_0_3px_rgba(0,255,102,0.12)]"
const labelCls = "mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/70"
const stepCls =
    "grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition " +
    "hover:border-[#00ff66]/50 hover:text-[#00ff66] disabled:cursor-not-allowed disabled:opacity-30 " +
    "disabled:hover:border-white/10 disabled:hover:text-white/70"

const CreateRoom = ({ onClose }: { onClose: () => void }) => {
    const [form, setForm] = useState({ roomName: "", duration: "15", numUsers: 2, userhandle: "" })
    const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("keydown", onKey)
            clearTimeout(timer.current)
        }
    }, [onClose])

    const set = (key: string, value: string | number) => {
        setStatus(null)
        setForm(f => ({ ...f, [key]: value }))
    }
    const step = (delta: number) => set("numUsers", Math.min(MAX_USERS, Math.max(MIN_USERS, form.numUsers + delta)))

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!form.roomName.trim() || !form.userhandle.trim()) {
            setStatus({ type: "error", text: "Add a room name and your handle to continue." })
            timer.current = setTimeout(() => setStatus(null), 3000)
            return
        }
        console.log("Form submitted with data:", form)
        setIsLoading(true)
        setStatus({ type: "success", text: "Room created. Generating your code..." })
        timer.current = setTimeout(() => setIsSubmitted(true), 2000)
    }

    if (isSubmitted) return <GeneratedCode onClose={onClose} />

    const fill = `${(Number(form.duration) / 60) * 100}%`

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-md
                bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,255,102,0.14),transparent_60%),rgba(2,4,3,0.85)]"
            onMouseDown={e => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-title"
        >
            <style>{`
                @keyframes cr-in { from { opacity: 0; transform: translateY(14px) scale(.97) } }
                @media (prefers-reduced-motion: reduce) { .cr-in { animation: none !important } }
            `}</style>

            <div
                className="cr-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#080b09] p-5
                    shadow-[0_0_90px_-25px_rgba(0,255,102,0.45),0_30px_60px_-20px_rgba(0,0,0,0.9)]"
                style={{ animation: "cr-in .3s cubic-bezier(.2,.8,.2,1) both" }}
            >
                <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff66] to-transparent" />

                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h2 id="create-room-title" className="text-lg font-semibold tracking-tight text-white">Create a room</h2>
                        <p className="text-sm text-white/50">Private, temporary, and gone when the timer ends.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="cursor-pointer rounded-lg p-1.5 text-white/40 transition hover:bg-red-600 hover:text-white
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff66]/60"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    {status && (
                        <div
                            role={status.type === "error" ? "alert" : "status"}
                            className={`rounded-lg border px-3 py-2 text-xs ${
                                status.type === "error"
                                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                                    : "border-[#00ff66]/30 bg-[#00ff66]/10 text-[#6dffa6]"
                            }`}
                        >
                            {status.text}
                        </div>
                    )}

                    <div>
                        <label htmlFor="roomName" className={labelCls}>Room name</label>
                        <input id="roomName" value={form.roomName} onChange={e => set("roomName", e.target.value)}
                            placeholder="Anonym099" autoComplete="off" className={inputCls} />
                    </div>

                    {/* Duration + fuse */}
                    <div>
                        <span className={labelCls}><Timer size={13} className="text-amber-400" /> Self-destructs after</span>
                        <div role="radiogroup" aria-label="Duration" className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
                            {DURATIONS.map(d => {
                                const active = form.duration === d.value
                                return (
                                    <button
                                        key={d.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => set("duration", d.value)}
                                        className={`cursor-pointer rounded-md py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff66]/60 ${
                                            active
                                                ? "bg-[#00ff66] font-semibold text-black shadow-[0_0_20px_-4px_rgba(0,255,102,0.8)]"
                                                : "text-white/60 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                                className="relative h-full rounded-full bg-gradient-to-r from-[#00ff66] via-lime-300 to-amber-400 transition-[width] duration-500"
                                style={{ width: fill }}
                            >
                                <span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_3px_rgba(251,191,36,0.8)]" />
                            </div>
                        </div>
                    </div>

                    {/* Seats */}
                    <div>
                        <span className={labelCls}><Users size={13} className="text-[#00ff66]" /> Seats in the room</span>
                        <div className="flex items-center gap-2">
                            <button type="button" aria-label="Fewer users" onClick={() => step(-1)} disabled={form.numUsers <= MIN_USERS} className={stepCls}>
                                <Minus size={16} />
                            </button>
                            <span aria-live="polite" className={`${inputCls} text-center font-mono text-base`}>{form.numUsers}</span>
                            <button type="button" aria-label="More users" onClick={() => step(1)} disabled={form.numUsers >= MAX_USERS} className={stepCls}>
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="userhandle" className={labelCls}>Your handle</label>
                        <input id="userhandle" value={form.userhandle} onChange={e => set("userhandle", e.target.value)}
                            placeholder="user101" autoComplete="off" className={`${inputCls} font-mono`} />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#00ff66] py-3 font-semibold text-black
                            shadow-[0_0_30px_-6px_rgba(0,255,102,0.7)] transition hover:bg-[#33ff85] active:scale-[0.99]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                            disabled:cursor-wait disabled:opacity-80"
                    >
                        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Creating room...</> : "Create room"}
                    </button>

                    <div className="flex items-start gap-2 text-xs text-white/50">
                        <ShieldAlert size={16} className="mt-px shrink-0 text-amber-400" />
                        <span>Creating a room generates a unique code. Share it only with people you want inside.</span>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CreateRoom