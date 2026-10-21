"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { apiErrorMessage, apiUrl, joinRoom, webSocketUrl } from "../../../lib/api"

type ChatMessage = {
    id: number | string
    time: string
    handle: string
    text: string
    system?: boolean
}

type JoinResponse = {
    room_code: string
    username: string
    role: string
    duration_minutes: number
    start_time: string | null
    end_time: string | null
}

type HistoryMessage = {
    id: number
    username: string
    content: string
    datetime: string
}

const SESSION_KEYS = [
    "dl-username",
    "dl-role",
    "dl-room-code",
    "dl-ws-code",
    "dl-admin-code",
    "dl-duration",
    "dl-end-time",
    "dl-left-room",
]

function clearRoomSession() {
    SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key))
}

function formatMessageTime(value: string) {
    const match = value.match(
        /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{2}):(\d{2}) (AM|PM) UTC$/
    )
    if (!match) return value

    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(match[1])
    if (month < 0) return value

    const hour = Number(match[4]) % 12 + (match[6] === "PM" ? 12 : 0)
    const date = new Date(Date.UTC(Number(match[3]), month, Number(match[2]), hour, Number(match[5])))
    return new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
    }).format(date)
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
    const messages = new Map<string, ChatMessage>()
    for (const message of [...current, ...incoming]) {
        messages.set(String(message.id), message)
    }
    return [...messages.values()].sort((left, right) => {
        if (typeof left.id === "number" && typeof right.id === "number") {
            return left.id - right.id
        }
        if (typeof left.id === "number") return -1
        if (typeof right.id === "number") return 1
        return 0
    })
}

function formatCountdown(milliseconds: number) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000))
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return hours > 0
        ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

function RoomPage() {
    const { id: code } = useParams<{ id: string }>()
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [role, setRole] = useState("U")
    const [roomCode, setRoomCode] = useState("")
    const [duration, setDuration] = useState<number | null>(null)
    const [endTime, setEndTime] = useState<string | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const remaining = endTime ? new Date(endTime).getTime() - now : null
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [text, setText] = useState("")
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
    const [roomError, setRoomError] = useState("")
    const [historyError, setHistoryError] = useState("")
    const [actionError, setActionError] = useState("")
    const [isEnding, setIsEnding] = useState(false)
    const [retry, setRetry] = useState(0)
    const bottom = useRef<HTMLDivElement>(null)
    const socketRef = useRef<WebSocket | null>(null)
    const expiredRef = useRef(false)
    const activeRouteRef = useRef(code)

    useEffect(() => {
        let cancelled = false
        let socket: WebSocket | null = null

        const connect = async () => {
            if (activeRouteRef.current !== code) {
                activeRouteRef.current = code
                setMessages([])
                setRoomCode("")
                setDuration(null)
                setEndTime(null)
                setHistoryError("")
                setActionError("")
                expiredRef.current = false
            }
            setConnectionStatus("connecting")
            setRoomError("")
            setHistoryError("")

            if (sessionStorage.getItem("dl-left-room") === "1") {
                router.replace("/")
                return
            }

            const storedUsername = sessionStorage.getItem("dl-username")
            const storedRole = sessionStorage.getItem("dl-role")
            const storedRoomCode = sessionStorage.getItem("dl-room-code")
            const storedSocketCode = sessionStorage.getItem("dl-ws-code")
            const hasCurrentSession = Boolean(
                storedUsername && storedRole && storedRoomCode && storedSocketCode === code
            )

            let activeUsername = hasCurrentSession ? storedUsername : null
            let activeRole = hasCurrentSession ? storedRole : null
            let activeRoomCode = hasCurrentSession ? storedRoomCode : null
            let activeDuration = hasCurrentSession
                ? Number(sessionStorage.getItem("dl-duration")) || null
                : null
            let activeEndTime = hasCurrentSession ? sessionStorage.getItem("dl-end-time") : null

            if (!hasCurrentSession) {
                activeUsername = new URLSearchParams(window.location.search).get("u")?.trim() || null
                if (!activeUsername) {
                    activeUsername = window.prompt("Choose a username to join this room:")?.trim() || null
                }
                if (!activeUsername) {
                    router.replace("/")
                    return
                }

                try {
                    const response = await joinRoom<JoinResponse>(code, activeUsername, () => {
                        setRoomError("Your previous connection is closing. Rejoining…")
                    })
                    if (cancelled) return
                    setRoomError("")
                    activeRole = response.data.role
                    activeRoomCode = response.data.room_code
                    activeDuration = response.data.duration_minutes
                    activeEndTime = response.data.end_time
                    sessionStorage.removeItem("dl-left-room")
                    sessionStorage.setItem("dl-username", activeUsername)
                    sessionStorage.setItem("dl-role", activeRole)
                    sessionStorage.setItem("dl-room-code", activeRoomCode)
                    sessionStorage.setItem("dl-ws-code", code)
                    sessionStorage.setItem("dl-duration", String(activeDuration))
                    if (activeEndTime) {
                        sessionStorage.setItem("dl-end-time", activeEndTime)
                    } else {
                        sessionStorage.removeItem("dl-end-time")
                    }
                    if (activeRole === "A") {
                        sessionStorage.setItem("dl-admin-code", code)
                    }
                } catch (error) {
                    if (!cancelled) {
                        setRoomError(apiErrorMessage(error, "Unable to join this room."))
                        setConnectionStatus("disconnected")
                    }
                    return
                }
            }

            if (cancelled || !activeUsername || !activeRoomCode) return

            setUsername(activeUsername)
            setRole(activeRole || "U")
            setRoomCode(activeRoomCode)
            setDuration(activeDuration)
            setEndTime(activeEndTime)
            setNow(Date.now())

            const query = new URLSearchParams({ username: activeUsername })
            socket = new WebSocket(webSocketUrl(`/ws/chat/${code}/?${query.toString()}`))
            socketRef.current = socket

            socket.onopen = () => {
                if (cancelled) return
                setConnectionStatus("connected")
                axios.get<{ results: HistoryMessage[] }>(
                    apiUrl(`/api/rooms/${activeRoomCode}/messages/`),
                    { params: { username: activeUsername, page: 1, page_size: 100 } }
                ).then((response) => {
                    if (cancelled) return
                    const history = response.data.results.map((message) => ({
                        id: message.id,
                        time: formatMessageTime(message.datetime),
                        handle: message.username,
                        text: message.content,
                    }))
                    setMessages((current) => mergeMessages(current, history))
                }).catch((error: unknown) => {
                    if (!cancelled) {
                        setHistoryError(apiErrorMessage(error, "Unable to load message history."))
                    }
                })
            }

            socket.onclose = (event) => {
                if (!cancelled) {
                    setConnectionStatus("disconnected")
                    if (event.code !== 1000) {
                        setRoomError("The room connection closed. Reconnect to continue chatting.")
                    }
                }
            }
            socket.onerror = () => {
                if (!cancelled) {
                    setConnectionStatus("disconnected")
                    setRoomError("The connection to this room failed. Check your connection and try again.")
                }
            }
            socket.onmessage = (event) => {
                try {
                    const data: unknown = JSON.parse(event.data)
                    if (!data || typeof data !== "object") {
                        throw new Error("The server sent an invalid message.")
                    }
                    const envelope = data as Record<string, unknown>
                    if (envelope.type === "room_closed") {
                        clearRoomSession()
                        router.replace("/")
                        return
                    }
                    if (envelope.type === "timer_started" && typeof envelope.end_time === "string") {
                        sessionStorage.setItem("dl-end-time", envelope.end_time)
                        setEndTime(envelope.end_time)
                        setNow(Date.now())
                        return
                    }
                    if (typeof envelope.error === "string") {
                        setMessages((current) => mergeMessages(current, [{
                            id: `system-${Date.now()}`,
                            time: "",
                            handle: "system",
                            text: envelope.error as string,
                            system: true,
                        }]))
                        return
                    }

                    const message = (
                        envelope.message_data && typeof envelope.message_data === "object"
                            ? envelope.message_data
                            : envelope
                    ) as Record<string, unknown>
                    if (
                        typeof message.id === "number" &&
                        typeof message.username === "string" &&
                        typeof message.message === "string"
                    ) {
                        setMessages((current) => mergeMessages(current, [{
                            id: message.id as number,
                            time: typeof message.datetime === "string"
                                ? formatMessageTime(message.datetime)
                                : "",
                            handle: message.username as string,
                            text: message.message as string,
                        }]))
                    }
                } catch (error) {
                    if (!cancelled) {
                        setRoomError(
                            error instanceof Error
                                ? error.message
                                : "The server sent an invalid message."
                        )
                    }
                }
            }
        }

        void connect()
        return () => {
            cancelled = true
            socket?.close()
            if (socketRef.current === socket) socketRef.current = null
        }
    }, [code, retry, router])

    useEffect(() => {
        bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        if (!endTime) return

        const timer = window.setInterval(() => {
            const currentTime = Date.now()
            setNow(currentTime)
            if (new Date(endTime).getTime() <= currentTime && !expiredRef.current) {
                expiredRef.current = true
                clearRoomSession()
                socketRef.current?.close()
                router.replace("/")
            }
        }, 1000)

        expiredRef.current = false
        return () => window.clearInterval(timer)
    }, [endTime, router])

    const sendMessage = () => {
        const message = text.trim()
        const socket = socketRef.current
        if (!message || message.length > 4000 || !socket || socket.readyState !== WebSocket.OPEN) {
            return
        }
        socket.send(JSON.stringify({ message }))
        setText("")
    }

    const leaveRoom = async () => {
        setActionError("")
        if (role === "A") {
            setIsEnding(true)
            try {
                await axios.delete(apiUrl(`/api/rooms/${roomCode}/admin/end/`), {
                    headers: {
                        "X-Admin-Username": username,
                        "X-Admin-Code": sessionStorage.getItem("dl-admin-code") || "",
                    },
                })
            } catch (error) {
                setActionError(apiErrorMessage(error, "Unable to end the room."))
                setIsEnding(false)
                return
            }
        } else {
            const socket = socketRef.current
            if (socket && socket.readyState < WebSocket.CLOSING) {
                await new Promise<void>((resolve) => {
                    const timeout = window.setTimeout(resolve, 1500)
                    socket.addEventListener("close", () => {
                        window.clearTimeout(timeout)
                        resolve()
                    }, { once: true })
                    socket.close(1000, "User left room")
                })
            }
        }

        clearRoomSession()
        socketRef.current = null
        router.replace("/")
    }

    const timerColor = remaining !== null && remaining < 5 * 60_000
        ? "text-red-500"
        : "text-green-400"

    const statusLabel =
        connectionStatus === "connected" ? "ONLINE"
            : connectionStatus === "connecting" ? "CONNECTING"
                : "OFFLINE"
    const statusColor =
        connectionStatus === "connected" ? "text-green-400"
            : connectionStatus === "connecting" ? "text-yellow-400"
                : "text-red-500"

    const errorText = roomError || historyError || actionError

    return (
        <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-black font-mono text-sm text-green-400 selection:bg-green-400 selection:text-black">
            {/* status bar */}
            <header className="shrink-0 border-b border-green-900 px-3 py-2 text-xs sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0 truncate">
                        <span className="font-bold text-green-400">darklink</span>
                        <span className="text-green-700">://</span>
                        <span className="text-green-300">{roomCode || code}</span>
                        {role === "A" && <span className="ml-2 text-yellow-400">[admin]</span>}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={statusColor}>[{statusLabel}]</span>
                        <span title={endTime || undefined} className={timerColor}>
                            {remaining !== null
                                ? formatCountdown(remaining)
                                : duration ? `${duration}m (waiting)` : "--:--"}
                        </span>
                        <button
                            type="button"
                            onClick={leaveRoom}
                            disabled={isEnding}
                            className="cursor-pointer text-green-400 hover:bg-green-400 hover:text-black disabled:cursor-wait disabled:opacity-50"
                        >
                            [{isEnding ? "closing..." : role === "A" ? "end room" : "exit"}]
                        </button>
                    </div>
                </div>
                <div className="mt-1 truncate text-green-700">
                    session: {username || "joining..."} | encrypted channel | messages expire with room
                </div>
            </header>

            {/* output */}
            <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6">
                <div className="mx-auto w-full max-w-4xl">
                    <p className="text-green-700">
                        $ connect --room {roomCode || code}
                    </p>
                    {connectionStatus === "connecting" && (
                        <p className="text-yellow-400">establishing connection...</p>
                    )}
                    {connectionStatus === "connected" && (
                        <p className="mb-2 text-green-700">connection established. type to send.</p>
                    )}

                    {errorText && (
                        <p role="alert" className="mb-2 text-red-500">
                            ERROR: {errorText}
                            {connectionStatus === "disconnected" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoomError("")
                                        setRetry((attempt) => attempt + 1)
                                    }}
                                    className="ml-3 cursor-pointer text-green-400 underline hover:bg-green-400 hover:text-black"
                                >
                                    [reconnect]
                                </button>
                            )}
                        </p>
                    )}

                    {messages.length === 0 && connectionStatus === "connected" && !historyError && (
                        <p className="text-green-700">-- no messages --</p>
                    )}

                    <div className="space-y-0.5">
                        {messages.map((message) => {
                            const isOwnMessage = message.handle === username
                            if (message.system) {
                                return (
                                    <p key={message.id} className="whitespace-pre-wrap break-words text-yellow-400">
                                        *** {message.text}
                                    </p>
                                )
                            }
                            return (
                                <p key={message.id} className="whitespace-pre-wrap break-words leading-6">
                                    {message.time && (
                                        <span className="text-green-800" title={`${message.time} UTC`}>
                                            [{message.time}]{" "}
                                        </span>
                                    )}
                                    <span className={isOwnMessage ? "font-bold text-green-400" : "font-bold text-cyan-400"}>
                                        &lt;{message.handle}&gt;
                                    </span>{" "}
                                    <span className={isOwnMessage ? "text-green-300" : "text-gray-200"}>
                                        {message.text}
                                    </span>
                                </p>
                            )
                        })}
                    </div>
                    <div ref={bottom} />
                </div>
            </section>

            {/* prompt */}
            <footer className="shrink-0 border-t border-green-900 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="mx-auto max-w-4xl">
                    <div className="flex items-start gap-2">
                        <label htmlFor="message" className="shrink-0 select-none py-1 leading-6 text-green-500">
                            {username || "guest"}@darklink:~$
                        </label>
                        <textarea
                            id="message"
                            value={text}
                            rows={1}
                            maxLength={4000}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={connectionStatus === "connected" ? "type here and press enter..." : "offline"}
                            onChange={(event) => setText(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault()
                                    sendMessage()
                                }
                            }}
                            className="max-h-28 min-h-8 min-w-0 flex-1 resize-none border border-green-900 bg-transparent px-2 py-1 leading-6 text-green-300 caret-green-400 outline-none placeholder:text-green-700 focus:border-green-400"
                        />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-green-800">
                        <span className="truncate">enter: send | shift+enter: new line</span>
                        <span>{text.length}/4000</span>
                    </div>
                </div>
            </footer>
        </main>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-black" />}>
            <RoomPage />
        </Suspense>
    )
}