"use client"


import { Suspense, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Send, Terminal, Users } from "lucide-react"
import axios from "axios"

type Msg = { id: number; time: string; handle: string; text: string; system?: boolean }

const clock = () => new Date().toTimeString().slice(0, 8)
const mmss = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

function RoomPage({ minutes = 30 }: { minutes?: number }) {
    const { id: code } = useParams<{ id: string }>();
    const [me, setMe] = useState("anonymous")
    const [role, setRole] = useState("U")
    const [msgs, setMsgs] = useState<Msg[]>([])
    const [text, setText] = useState("")
    const [left, setLeft] = useState(minutes * 60_000)
    const [connected, setConnected] = useState(false)
    const bottom = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const router = useRouter()

    const roomCode = (typeof window !== "undefined" ? sessionStorage.getItem("dl-room-code") : null) || code
    const wsCode = (typeof window !== "undefined" ? sessionStorage.getItem("dl-ws-code") : null) || code
    const adminCode = (typeof window !== "undefined" ? sessionStorage.getItem("dl-admin-code") : null) || ""
    const roomDuration = (typeof window !== "undefined" ? Number(sessionStorage.getItem("dl-duration") || "30") : 30)

    useEffect(() => {
        if (typeof window !== "undefined" && sessionStorage.getItem("dl-left-room") === "1") {
            router.replace("/")
        }
    }, [router])

    useEffect(() => {
        setMe(sessionStorage.getItem("dl-username") || "anonymous")
        setRole(sessionStorage.getItem("dl-role") || "U")
        const endTime = sessionStorage.getItem("dl-end-time")
        if (endTime) setLeft(new Date(endTime).getTime() - Date.now())
    }, [])

    useEffect(() => {
        bottom.current?.scrollIntoView({ block: "end" })
    }, [msgs])

    useEffect(() => {
        let cancelled = false
        if (typeof window !== "undefined" && sessionStorage.getItem("dl-left-room") === "1") {
            router.replace("/")
            return
        }
        const wsUrlCode = wsCode

        const start = async () => {
            if (typeof window !== "undefined" && sessionStorage.getItem("dl-left-room") === "1") {
                router.replace("/")
                return
            }
            let username = sessionStorage.getItem("dl-username")
      if (!username && typeof window !== "undefined") {
        const q = new URLSearchParams(window.location.search).get("u")
        if (q) username = q
      }
            let roleValue = sessionStorage.getItem("dl-role")
            let endValue = sessionStorage.getItem("dl-end-time")
            const roomValue = sessionStorage.getItem("dl-room-code") || code
            const adminValue = sessionStorage.getItem("dl-admin-code") || ""

            if (!username) {
                username = window.prompt("Choose a username to join this room:")
                if (!username || !username.trim()) {
                    router.push("/")
                    return
                }
                username = username.trim()
                try {
                    const jr = await axios.post(`http://127.0.0.1:8000/api/rooms/${code}/join/`, {
                        username,
                    })
                    sessionStorage.setItem("dl-username", username)
                    sessionStorage.setItem("dl-role", jr.data.role)
                    sessionStorage.setItem("dl-room-code", jr.data.room_code)
                    sessionStorage.setItem("dl-ws-code", code)
                    if (jr.data.end_time) sessionStorage.setItem("dl-end-time", jr.data.end_time)
                    if (jr.data.duration_minutes) sessionStorage.setItem("dl-duration", String(jr.data.duration_minutes))
                    if (jr.data.role === "A") sessionStorage.setItem("dl-admin-code", code)
                    roleValue = jr.data.role
                    endValue = jr.data.end_time
                } catch (err: any) {
                    const data = err?.response?.data
                    alert(
                        typeof data === "string"
                            ? data
                            : data?.error || data?.detail || data?.message || "Unable to join room."
                    )
                    router.push("/")
                    return
                }
            }

            if (cancelled) return
            setMe(username)
            setRole(roleValue || "U")
            if (endValue) setLeft(new Date(endValue).getTime() - Date.now())

            const rCode = sessionStorage.getItem("dl-room-code") || roomValue
            const wCode = sessionStorage.getItem("dl-ws-code") || wsUrlCode
            const aCode = sessionStorage.getItem("dl-admin-code") || adminValue

            try {
                const res = await axios.get(`http://127.0.0.1:8000/api/rooms/${rCode}/messages/`, {
                    params: { username, page: 1, page_size: 100 },
                })
                if (cancelled) return
                const items = res.data.results || []
                setMsgs(items.map((m: any) => ({
                    id: m.id,
                    time: new Date(m.datetime).toTimeString().slice(0, 8),
                    handle: m.username,
                    text: m.content,
                })))
            } catch { }

            if (cancelled) return
            const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${wCode}/?username=${encodeURIComponent(username)}`)
            wsRef.current = ws
            ws.onopen = () => setConnected(true)
            ws.onclose = () => setConnected(false)
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === "room_closed") {
                        alert("Room closed.")
                        router.replace("/")
                        return
                    }
                    if (data.type === "timer_started" && data.end_time) {
                        sessionStorage.setItem("dl-end-time", data.end_time)
                        setLeft(new Date(data.end_time).getTime() - Date.now())
                        return
                    }
                    if (data.error) {
                        setMsgs(m => [...m, { id: Date.now(), time: clock(), handle: "system", text: data.error, system: true }])
                        return
                    }
                    if (data.message && data.username) {
                        setMsgs(m => [...m, {
                            id: data.id || Date.now(),
                            time: data.datetime ? new Date(data.datetime).toTimeString().slice(0, 8) : clock(),
                            handle: data.username,
                            text: data.message,
                        }])
                    }
                } catch { }
            }
            // store admin code for end action
            if (aCode) sessionStorage.setItem("dl-admin-code", aCode)
        }

        start()
        return () => {
            cancelled = true
            try { wsRef.current?.close() } catch { }
        }
    }, [code])

    useEffect(() => {
        const tick = () => {
            const end = sessionStorage.getItem("dl-end-time")
            const remaining = end ? new Date(end).getTime() - Date.now() : minutes * 60_000
            setLeft(remaining)
            if (remaining <= 0 && typeof window !== "undefined" && sessionStorage.getItem("dl-left-room") !== "1") {
                sessionStorage.setItem("dl-left-room", "1")
                sessionStorage.removeItem("dl-username")
                sessionStorage.removeItem("dl-room-code")
                sessionStorage.removeItem("dl-ws-code")
                sessionStorage.removeItem("dl-admin-code")
                try { wsRef.current?.close() } catch { }
                router.replace("/")
            }
        }
        tick()
        const t = setInterval(tick, 500)
        return () => clearInterval(t)
    }, [minutes])

    const send = () => {
        const t = text.trim()
        if (!t || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        wsRef.current.send(JSON.stringify({ message: t }))
        setText("")
    }

    const terminateSession = async () => {
        try {
            if (role === "A") {
                await axios.delete(`http://127.0.0.1:8000/api/rooms/${wsCode}/admin/end/`, {
                    headers: {
                        "X-Admin-Username": me,
                        "X-Admin-Code": adminCode || wsCode,
                    },
                })
            }
        } catch { }
        if (typeof window !== "undefined") {
            sessionStorage.setItem("dl-left-room", "1")
            sessionStorage.removeItem("dl-username")
            sessionStorage.removeItem("dl-room-code")
            sessionStorage.removeItem("dl-ws-code")
            sessionStorage.removeItem("dl-admin-code")
            sessionStorage.removeItem("dl-end-time")
        }
        try { wsRef.current?.close() } catch { }
        router.replace("/")
    }

    const timerColor = left < 5 * 60_000 ? "text-red-500" : left < (minutes * 60_000) / 4 ? "text-amber-400" : "text-emerald-400"

    return (
        <div className="flex h-[100dvh] flex-col bg-[#0A0A0A] text-[#F5F5F5]" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] bg-[#111] px-3 py-2 sm:h-12 sm:flex-nowrap sm:px-4 sm:py-0 text-xs">
                <div>
                    <span className="flex items-center gap-2 font-bold"><Terminal size={16} className="text-[#00FF66]" /><div>dark<span className="text-[#00ff66]">link</span></div></span>
                    <span className="text-[#858585]">{code}</span>
                    {role === "A" && <span className="ml-2 rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400">ADMIN</span>}
                    {!connected && <span className="ml-2 text-red-400">disconnected</span>}
                </div>
                <div>
                    <span className={`hidden sm:inline font-bold tabular-nums ${timerColor}`}>{mmss(left)}</span>
                </div>
                <div className="flex">
                    <span className="ml-auto flex items-center gap-1 text-[#858585] mr-2"><Users size={14} />: 02</span>
                    <div className={`py-1 px-2 border bg-gray-900 cursor-pointer rounded-md hover:text-white ${role === "A" ? "text-red-600 hover:bg-red-600" : "text-white/70 hover:bg-white/10"}`} onClick={terminateSession}>{role === "A" ? "End" : "Exit"}</div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto py-2">
                {msgs.map(m => (
                    <div key={m.id} className="flex flex-row items-start gap-2 px-4 py-0.5 text-xs sm:text-[13px] leading-6 break-words">
                        <span className="hidden sm:inline shrink-0 text-[#858585]">[{m.time}]</span>
                        <span className={`shrink-0 ${m.system ? "text-[#00FF66]" : m.handle === me ? "text-[#00FF66]" : "text-[#858585]"}`}>&lt;{m.handle}&gt;</span>
                        <span className={`min-w-0 whitespace-pre-wrap break-words ${m.system ? "text-[#00FF66]" : ""}`}>{m.text}</span>
                    </div>
                ))}
                <div ref={bottom} />
            </div>

            <div className="shrink-0 border-t border-[#262626] bg-[#111] p-3">
                <div className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#0A0A0A] p-2 transition focus-within:border-[#00FF66]/70">
                    <textarea
                        value={text}
                        rows={1}
                        maxLength={2000}
                        placeholder="Type an encrypted message..."
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                        className="max-h-32 min-w-0 flex-1 resize-none bg-transparent px-1 text-[13px] outline-none placeholder:text-[#858585]/70"
                    />
                    <button
                        onClick={send}
                        disabled={!text.trim()}
                        aria-label="Send"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#00FF66] text-black transition hover:bg-[#33ff85] disabled:opacity-30"
                    >
                        <Send size={15} />
                    </button>
                </div>
            </div>
        </div>
    )
}


export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
            <RoomPage />
        </Suspense>
    )
}
