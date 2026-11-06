import { ShieldAlert, X, Minus, Plus, Timer, Users, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import GeneratedCode from "./GeneratedCode"
import axios from "axios"
import { apiErrorMessage, apiUrl } from "../lib/api"

const DURATIONS = [
    { value: "15", label: "15 min" },
    { value: "30", label: "30 min" },
    { value: "60", label: "1 hour" },
]
const MIN_USERS = 2
const MAX_USERS = 20

type TextField = "roomName" | "userhandle"

const FIELD_LABELS: Record<TextField, string> = {
    roomName: "Room name",
    userhandle: "Handle",
}
const MIN_LENGTH = 2

// Runs entirely in the browser, so the user sees these before anything is sent to the server.
function validateField(field: TextField, value: string): string {
    const text = value.trim()
    const label = FIELD_LABELS[field]
    if (!text) return `${label} is required.`
    if (text.length < MIN_LENGTH) return `${label} must be at least ${MIN_LENGTH} characters.`
    if (/^\d/.test(text)) return `${label} can't start with a number.`
    return ""
}

const inputBase =
    "w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm text-gray-100 " +
    "placeholder:text-white/25 outline-none transition "
const inputValid =
    "border-white/10 hover:border-white/20 " +
    "focus:border-[#00ff66]/70 focus:bg-[#00ff66]/[0.04] focus:shadow-[0_0_0_3px_rgba(0,255,102,0.12)]"
const inputInvalid =
    "border-red-500/70 bg-red-500/[0.05] hover:border-red-500 " +
    "focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"
const inputCls = inputBase + inputValid
const labelCls = "mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/70"
const stepCls =
    "grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition " +
    "hover:border-[#00ff66]/50 hover:text-[#00ff66] disabled:cursor-not-allowed disabled:opacity-30 " +
    "disabled:hover:border-white/10 disabled:hover:text-white/70"

const CreateRoom = ({ onClose }: { onClose: () => void }) => {
    const [form, setForm] = useState({ roomName: "", duration: "15", numUsers: 2, userhandle: "" })
    const [touched, setTouched] = useState<Record<TextField, boolean>>({ roomName: false, userhandle: false })
    const [status, setStatus] = useState<{ type: "error" | "success"; text: string } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [codes, setCodes] = useState<{ room_code: string; admin_code: string; username: string } | null>(null)

    const roomNameRef = useRef<HTMLInputElement>(null)
    const handleRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("keydown", onKey)
        }
    }, [onClose])

    const set = (key: string, value: string | number) => {
        setStatus(null)
        setForm(f => ({ ...f, [key]: value }))
    }
    const step = (delta: number) => set("numUsers", Math.min(MAX_USERS, Math.max(MIN_USERS, form.numUsers + delta)))

    // Errors are computed live, so they clear as soon as the user types something.
    const errors: Record<TextField, string> = {
        roomName: validateField("roomName", form.roomName),
        userhandle: validateField("userhandle", form.userhandle),
    }
    const showError = (field: TextField) => touched[field] && Boolean(errors[field])
    const markTouched = (field: TextField) => setTouched(t => ({ ...t, [field]: true }))

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // Flag every invalid field in red and focus the first one. Nothing is sent to the server.
        if (errors.roomName || errors.userhandle) {
            setTouched({ roomName: true, userhandle: true })
            ;(errors.roomName ? roomNameRef.current : handleRef.current)?.focus()
            return
        }

        setIsLoading(true)
        setStatus(null)
        try {
            const res = await axios.post(
                apiUrl("/api/rooms/"),
                {
                    group_name: form.roomName.trim(),
                    username: form.userhandle.trim(),
                    limit: form.numUsers,
                    duration_minutes: Number(form.duration),
                },
                { timeout: 30_000 } // give up after 30 seconds
            )
            setCodes(res.data)
            setIsSubmitted(true)
        } catch (error: unknown) {
            setIsLoading(false)
            if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
                setStatus({
                    type: "error",
                    text: "This is taking too long. Check your connection and try again.",
                })
            } else {
                setStatus({ type: "error", text: apiErrorMessage(error, "Failed to create room.") })
            }
        }
    }

    if (isSubmitted && codes) return <GeneratedCode onClose={onClose} roomCode={codes.room_code} adminCode={codes.admin_code} hostUsername={codes.username} />

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-md
                bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,255,102,0.14),transparent_60%),rgba(2,4,3,0.85)]"
            onMouseDown={e => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-title"
        >
            <div
                className="cr-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#080b09] p-5
                    shadow-[0_0_90px_-25px_rgba(0,255,102,0.45),0_30px_60px_-20px_rgba(0,0,0,0.9)]"
                style={{ animation: "cr-in .3s cubic-bezier(.2,.8,.2,1) both" }}
            >
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
                            className={`rounded-lg border px-3 py-2 text-xs ${status.type === "error"
                                ? "border-red-500/40 bg-red-500/10 text-red-300"
                                : "border-[#00ff66]/30 bg-[#00ff66]/10 text-[#6dffa6]"
                                }`}
                        >
                            {status.text}
                        </div>
                    )}

                    <div>
                        <label htmlFor="roomName" className={labelCls}>Room name</label>
                        <input
                            id="roomName"
                            ref={roomNameRef}
                            value={form.roomName}
                            onChange={e => set("roomName", e.target.value)}
                            onBlur={() => markTouched("roomName")}
                            placeholder="Roomie"
                            required
                            autoComplete="off"
                            aria-invalid={showError("roomName")}
                            aria-describedby={showError("roomName") ? "roomName-error" : undefined}
                            className={inputBase + (showError("roomName") ? inputInvalid : inputValid)}
                        />
                        {showError("roomName") && (
                            <p id="roomName-error" role="alert" className="mt-1.5 text-xs text-red-400">
                                {errors.roomName}
                            </p>
                        )}
                    </div>

                    {/* Duration */}
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
                                        className={`cursor-pointer rounded-md py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff66]/60 ${active
                                            ? "bg-[#00ff66] font-semibold text-black shadow-[0_0_20px_-4px_rgba(0,255,102,0.8)]"
                                            : "text-white/60 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        {d.label}
                                    </button>
                                )
                            })}
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
                        <input
                            id="userhandle"
                            ref={handleRef}
                            value={form.userhandle}
                            onChange={e => set("userhandle", e.target.value)}
                            onBlur={() => markTouched("userhandle")}
                            placeholder="user101"
                            required
                            autoComplete="off"
                            aria-invalid={showError("userhandle")}
                            aria-describedby={showError("userhandle") ? "userhandle-error" : undefined}
                            className={`${inputBase}${showError("userhandle") ? inputInvalid : inputValid} font-mono`}
                        />
                        {showError("userhandle") && (
                            <p id="userhandle-error" role="alert" className="mt-1.5 text-xs text-red-400">
                                {errors.userhandle}
                            </p>
                        )}
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