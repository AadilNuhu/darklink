"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { apiErrorMessage, joinRoom } from "../lib/api"

type Modal = { onClose: () => void }
type Field = "code" | "username"

const CODE_LENGTH = 8
const MIN_USERNAME_LENGTH = 2

const inputBase =
    "w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm text-gray-100 " +
    "placeholder:text-white/25 outline-none transition "
const inputValid =
    "border-white/10 hover:border-white/20 " +
    "focus:border-[#00ff66]/70 focus:bg-[#00ff66]/[0.04] focus:shadow-[0_0_0_3px_rgba(0,255,102,0.12)]"
const inputInvalid =
    "border-red-500/70 bg-red-500/[0.05] hover:border-red-500 " +
    "focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"

const labelCls = "mb-1.5 block text-xs font-medium text-white/70"

// Runs entirely in the browser, so the user sees these before anything is sent to the server.
function validateField(field: Field, value: string): string {
    const text = value.trim()
    if (field === "code") {
        if (!text) return "Room code is required."
        if (text.length < CODE_LENGTH) return `Room code must be ${CODE_LENGTH} characters.`
        return ""
    }
    if (!text) return "Username is required."
    if (text.length < MIN_USERNAME_LENGTH) return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`
    if (/^\d/.test(text)) return "Username can't start with a number."
    return ""
}

const EnterRoom = ({ onClose }: Modal) => {
    const router = useRouter()
    const [code, setCode] = useState("")
    const [username, setUsername] = useState("")
    const [touched, setTouched] = useState<Record<Field, boolean>>({ code: false, username: false })
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const codeRef = useRef<HTMLInputElement>(null)
    const usernameRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("keydown", onKey)
            clearTimeout(timer.current)
        }
    }, [onClose])

    // Errors are computed live, so they clear as soon as the value becomes valid.
    const errors: Record<Field, string> = {
        code: validateField("code", code),
        username: validateField("username", username),
    }
    const showError = (field: Field) => touched[field] && Boolean(errors[field])
    const markTouched = (field: Field) => setTouched(t => ({ ...t, [field]: true }))

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // Flag every invalid field in red and focus the first one. Nothing is sent to the server.
        if (errors.code || errors.username) {
            setTouched({ code: true, username: true })
            ;(errors.code ? codeRef.current : usernameRef.current)?.focus()
            return
        }

        setError("")
        setSuccess("")
        setIsLoading(true)
        try {
            const res = await joinRoom<{
                room_code: string
                role: string
                duration_minutes: number
                end_time: string | null
            }>(code, username.trim(), () => {
                setSuccess("Your previous connection is closing. Rejoining…")
            })
            sessionStorage.removeItem("dl-left-room")
            sessionStorage.setItem("dl-username", username.trim())
            sessionStorage.setItem("dl-role", res.data.role)
            if (res.data.duration_minutes) sessionStorage.setItem("dl-duration", String(res.data.duration_minutes))
            sessionStorage.setItem("dl-room-code", res.data.room_code)
            sessionStorage.setItem("dl-ws-code", code)
            if (res.data.end_time) sessionStorage.setItem("dl-end-time", res.data.end_time)
            if (res.data.role === "A") sessionStorage.setItem("dl-admin-code", code)
            setSuccess("Access granted. Joining...")
            timer.current = setTimeout(() => router.push(`/room/${res.data.room_code}`), 800)
        } catch (error: unknown) {
            setError(apiErrorMessage(error, "Unable to join room."))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-md
                bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,255,102,0.14),transparent_60%),rgba(2,4,3,0.85)]"
            onMouseDown={e => e.target === e.currentTarget && onClose()}
        >
            <style>{`
                @keyframes er-in { from { opacity: 0; transform: translateY(14px) scale(.97) } }
                @media (prefers-reduced-motion: reduce) { .er-in { animation: none !important } }
            `}</style>

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

                    <div className="mb-4">
                        <label htmlFor="code" className={labelCls}>Room code</label>
                        <input
                            id="code"
                            ref={codeRef}
                            type="text"
                            value={code}
                            autoFocus
                            autoComplete="off"
                            spellCheck={false}
                            maxLength={CODE_LENGTH}
                            placeholder="B67H9IS0"
                            aria-invalid={showError("code")}
                            aria-describedby={showError("code") ? "code-error" : undefined}
                            onChange={e => {
                                setError("")
                                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                            }}
                            onBlur={() => markTouched("code")}
                            className={`${inputBase}${showError("code") ? inputInvalid : inputValid} text-center font-mono text-lg font-semibold tracking-[0.35em] ${showError("code") ? "text-red-300" : "text-[#6dffa6]"}`}
                        />
                        {showError("code") && (
                            <p id="code-error" role="alert" className="mt-1.5 text-xs text-red-400">
                                {errors.code}
                            </p>
                        )}
                    </div>

                    <div className="mb-5">
                        <label htmlFor="username" className={labelCls}>Username</label>
                        <input
                            id="username"
                            ref={usernameRef}
                            type="text"
                            value={username}
                            autoComplete="off"
                            placeholder="anonymous"
                            aria-invalid={showError("username")}
                            aria-describedby={showError("username") ? "username-error" : undefined}
                            onChange={e => {
                                setError("")
                                setUsername(e.target.value)
                            }}
                            onBlur={() => markTouched("username")}
                            className={`${inputBase}${showError("username") ? inputInvalid : inputValid} pl-4 font-mono`}
                        />
                        {showError("username") && (
                            <p id="username-error" role="alert" className="mt-1.5 text-xs text-red-400">
                                {errors.username}
                            </p>
                        )}
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