"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { Send, Timer } from "lucide-react"
import { apiErrorMessage, apiUrl, joinRoom, webSocketUrl } from "../../../lib/api"

type ChatMessage = {
    id: number | string
    time: string
    handle: string
    text: string
    system?: boolean
    delivery?: "queued" | "sending" | "unconfirmed"
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

const MAX_QUEUED_MESSAGES = 20
const PARTICIPANT_HUES = [
    210, 265, 320, 25, 180, 235, 290, 345, 50, 195,
    250, 305, 10, 165, 220, 275, 330, 35, 190, 245,
]

function participantHue(index: number) {
    return PARTICIPANT_HUES[index % PARTICIPANT_HUES.length]
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
    const participantColors = new Map<string, number>()
    let participantIndex = 0
    for (const message of messages) {
        if (message.system || message.handle === username || participantColors.has(message.handle)) continue
        participantColors.set(message.handle, participantHue(participantIndex))
        participantIndex += 1
    }

    const [text, setText] = useState("")
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
    const [roomError, setRoomError] = useState("")
    const [historyError, setHistoryError] = useState("")
    const [actionError, setActionError] = useState("")
    const [isEnding, setIsEnding] = useState(false)
    const [retry, setRetry] = useState(0)
    const reconnectTimer = useRef<number | null>(null)
    const reconnectAttempt = useRef(0)
    const nextLocalMessageId = useRef(0)
    const outgoingMessages = useRef<ChatMessage[]>([])
    const joinUsername = useRef<string | null>(null)
    const bottom = useRef<HTMLDivElement>(null)
    const socketRef = useRef<WebSocket | null>(null)
    const expiredRef = useRef(false)
    const roomEndingRef = useRef(false)
    const activeRouteRef = useRef(code)

    const notifyRoomEnded = useCallback((message: string) => {
        if (roomEndingRef.current) return
        roomEndingRef.current = true
        outgoingMessages.current = []
        clearRoomSession()
        window.alert(message)
        socketRef.current?.close(1000, "Room ended")
        socketRef.current = null
        router.replace("/")
    }, [router])

    const updatePendingDelivery = useCallback((id: ChatMessage["id"], delivery: ChatMessage["delivery"]) => {
        outgoingMessages.current = outgoingMessages.current.map((message) =>
            message.id === id ? { ...message, delivery } : message
        )
        setMessages((current) => current.map((message) =>
            message.id === id ? { ...message, delivery } : message
        ))
    }, [])

    useEffect(() => {
        let cancelled = false
        let socket: WebSocket | null = null
        let reconnectScheduled = false

        const scheduleReconnect = () => {
            if (cancelled || reconnectScheduled) return
            reconnectScheduled = true
            const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 15000)
            reconnectAttempt.current += 1
            reconnectTimer.current = window.setTimeout(() => {
                reconnectTimer.current = null
                setRetry((attempt) => attempt + 1)
            }, delay)
        }

        const confirmOutgoingMessage = (username: string, content: string) => {
            const pending = outgoingMessages.current.find((message) =>
                message.handle === username &&
                message.text === content &&
                message.delivery !== "queued"
            )
            if (!pending) return
            outgoingMessages.current = outgoingMessages.current.filter(
                (message) => message.id !== pending.id
            )
            setMessages((current) => current.filter((message) => message.id !== pending.id))
        }

        const flushQueuedMessages = () => {
            const activeSocket = socketRef.current
            if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return
            for (const message of outgoingMessages.current) {
                if (message.delivery !== "queued") continue
                try {
                    activeSocket.send(JSON.stringify({ message: message.text }))
                    updatePendingDelivery(message.id, "sending")
                } catch {
                    setActionError("Some messages are still queued. Check your connection and try again.")
                    activeSocket.close()
                    break
                }
            }
        }

        const connect = async () => {
            if (activeRouteRef.current !== code) {
                activeRouteRef.current = code
                outgoingMessages.current = []
                joinUsername.current = null
                roomEndingRef.current = false
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
            const storedSocketCode = sessionStorage.getItem("dl-ws-code") || ""
            const hasCurrentSession = Boolean(
                storedUsername && storedRole && storedRoomCode === code && storedSocketCode
            )

            let activeUsername = hasCurrentSession ? storedUsername : null
            let activeRole = hasCurrentSession ? storedRole : null
            let activeRoomCode = hasCurrentSession ? storedRoomCode : null
            let activeSocketCode = hasCurrentSession ? storedSocketCode : code
            let activeDuration = hasCurrentSession
                ? Number(sessionStorage.getItem("dl-duration")) || null
                : null
            let activeEndTime = hasCurrentSession ? sessionStorage.getItem("dl-end-time") : null

            if (!hasCurrentSession) {
                activeUsername =
                    joinUsername.current ||
                    new URLSearchParams(window.location.search).get("u")?.trim() ||
                    null
                if (!activeUsername) {
                    router.replace("/")
                    return
                }
                joinUsername.current = activeUsername

                try {
                    const response = await joinRoom<JoinResponse>(code, activeUsername, () => {
                        setRoomError("Your previous connection is closing. Rejoining…")
                    })
                    if (cancelled) return
                    setRoomError("")
                    activeRole = response.data.role
                    activeRoomCode = response.data.room_code
                    activeSocketCode = code
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
                        scheduleReconnect()
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
            try {
                socket = new WebSocket(webSocketUrl(`/ws/chat/${activeSocketCode}/?${query.toString()}`))
            } catch {
                if (!cancelled) {
                    setConnectionStatus("disconnected")
                    setRoomError("Unable to start the room connection. Check your network settings and try again.")
                    scheduleReconnect()
                }
                return
            }
            socketRef.current = socket

            socket.onopen = () => {
                if (cancelled) return
                reconnectAttempt.current = 0
                setConnectionStatus("connected")
                axios.get<{ results: HistoryMessage[] }>(
                    apiUrl(`/api/rooms/${activeRoomCode}/messages/`),
                    { params: { username: activeUsername, page: 1, page_size: 100 } }
                ).then((response) => {
                    if (cancelled) return
                    response.data.results.forEach((message) =>
                        confirmOutgoingMessage(message.username, message.content)
                    )
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
                flushQueuedMessages()
            }

            socket.onclose = (event) => {
                if (!cancelled && !roomEndingRef.current) {
                    setConnectionStatus("disconnected")
                    outgoingMessages.current
                        .filter((message) => message.delivery === "sending")
                        .forEach((message) => updatePendingDelivery(message.id, "unconfirmed"))
                    if (event.code !== 1000) {
                        setRoomError("The room connection closed. Reconnect to continue chatting.")
                        scheduleReconnect()
                    }
                }
            }
            socket.onerror = () => {
                if (!cancelled && !roomEndingRef.current) {
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
                        notifyRoomEnded("This room has ended. You’ll be returned to the home page.")
                        return
                    }
                    if (envelope.type === "timer_started" && typeof envelope.end_time === "string") {
                        sessionStorage.setItem("dl-end-time", envelope.end_time)
                        setEndTime(envelope.end_time)
                        setNow(Date.now())
                        return
                    }
                    if (typeof envelope.error === "string") {
                        const sendingMessage = outgoingMessages.current.find(
                            (message) => message.delivery === "sending"
                        )
                        if (sendingMessage) {
                            outgoingMessages.current = outgoingMessages.current.filter(
                                (message) => message.id !== sendingMessage.id
                            )
                            setMessages((current) => current.filter(
                                (message) => message.id !== sendingMessage.id
                            ))
                        }
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
                        confirmOutgoingMessage(message.username, message.message)
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
            if (reconnectTimer.current !== null) {
                window.clearTimeout(reconnectTimer.current)
                reconnectTimer.current = null
            }
            socket?.close()
            if (socketRef.current === socket) socketRef.current = null
        }
    }, [code, retry, router, notifyRoomEnded, updatePendingDelivery])

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
                notifyRoomEnded("The room timer has expired. You’ll be returned to the home page.")
            }
        }, 1000)

        expiredRef.current = false
        return () => window.clearInterval(timer)
    }, [endTime, router, notifyRoomEnded])

    const sendMessage = () => {
        const message = text.trim()
        if (!message || message.length > 4000) {
            return
        }
        if (outgoingMessages.current.length >= MAX_QUEUED_MESSAGES) {
            setActionError(`You can queue up to ${MAX_QUEUED_MESSAGES} messages while reconnecting.`)
            return
        }
        const queuedMessage: ChatMessage = {
            id: `local-${Date.now()}-${++nextLocalMessageId.current}`,
            time: "",
            handle: username,
            text: message,
            delivery: "queued",
        }
        outgoingMessages.current = [...outgoingMessages.current, queuedMessage]
        setMessages((current) => mergeMessages(current, [queuedMessage]))
        setActionError("")
        setText("")
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const socket = socketRef.current
            try {
                socket.send(JSON.stringify({ message }))
                updatePendingDelivery(queuedMessage.id, "sending")
            } catch {
                setActionError("Message queued. It will be sent when the connection returns.")
                socket.close()
            }
        }
    }

    const retryMessage = (id: ChatMessage["id"]) => {
        updatePendingDelivery(id, "queued")
        const socket = socketRef.current
        if (!socket || socket.readyState !== WebSocket.OPEN) return
        const message = outgoingMessages.current.find((item) => item.id === id)
        if (!message) return
        try {
            socket.send(JSON.stringify({ message: message.text }))
            updatePendingDelivery(id, "sending")
        } catch {
            setActionError("Message remains queued until the connection returns.")
            socket.close()
        }
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
            notifyRoomEnded("You ended the room. You’ll be returned to the home page.")
            return
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

        outgoingMessages.current = []
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
        <main className="flex h-[100dvh] min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-clip overflow-y-hidden bg-[#070a08] font-mono text-sm text-green-400 selection:bg-green-400 selection:text-black">
            <header className="shrink-0 border-b border-white/10 bg-[#0b100d] px-4 py-3 text-xs sm:px-6">
                <div className="mx-auto max-w-5xl">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate">
                            <span className="font-bold tracking-wide text-white">darklynk</span>
                            <span className="text-green-700">://</span>
                            <span className="text-green-300">{roomCode || code}</span>
                            {role === "A" && <span className="ml-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">ADMIN</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                            <span className={`rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 ${statusColor}`}>
                                <span className="hidden sm:inline">[{statusLabel}]</span>
                                <span className="sm:hidden">{statusLabel === "ONLINE" ? "LIVE" : statusLabel}</span>
                            </span>
                            <span
                                title={endTime || (duration ? "Room timer starts when everyone joins." : undefined)}
                                className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 ${timerColor}`}
                            >
                                <Timer size={13} aria-hidden="true" />
                                <span>
                                    {remaining !== null
                                        ? formatCountdown(remaining)
                                        : duration ? `${duration}m` : "--:--"}
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={leaveRoom}
                                disabled={isEnding}
                                className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-white/75 transition hover:border-green-400/40 hover:bg-green-400/10 hover:text-green-300 disabled:cursor-wait disabled:opacity-50"
                            >
                                {isEnding ? "Closing…" : role === "A" ? "End room" : "Leave"}
                            </button>
                        </div>
                    </div>
                    <div className="mt-2 flex min-w-0 items-center gap-2 truncate text-[11px] text-white/40">
                        <span className="truncate">{username || "joining..."}</span>
                        <span className="text-white/20">·</span>
                        <span className="truncate">Private room · messages expire with the room</span>
                    </div>
                </div>
            </header>

            <section className="min-h-0 min-w-0 w-full flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                <div className="mx-auto w-full min-w-0 max-w-5xl">
                    <p className="mb-3 text-xs text-green-700">
                        <span className="text-green-500">$</span> connected to room {roomCode || code}
                    </p>
                    {connectionStatus === "connecting" && (
                        <p role="status" className="mb-3 text-xs text-yellow-300">Establishing connection…</p>
                    )}
                    {connectionStatus === "connected" && (
                        <p className="mb-5 text-xs text-green-700">Connection established. Your messages appear here.</p>
                    )}

                    {errorText && (
                        <p role="alert" className="mb-4 break-words rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300">
                            {errorText}
                            {connectionStatus === "disconnected" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoomError("")
                                        setRetry((attempt) => attempt + 1)
                                    }}
                                    className="ml-3 cursor-pointer text-green-300 underline underline-offset-2"
                                >
                                    Reconnect
                                </button>
                            )}
                        </p>
                    )}

                    {messages.length === 0 && connectionStatus === "connected" && !historyError && (
                        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-white/35">
                            No messages yet. Start the conversation below.
                        </p>
                    )}

                    <div className="space-y-3">
                        {messages.map((message) => {
                            const isOwnMessage = message.handle === username
                            if (message.system) {
                                return (
                                    <p key={message.id} className="whitespace-pre-wrap break-words rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-xs text-amber-200">
                                        {message.text}
                                    </p>
                                )
                            }
                            const senderColor = isOwnMessage
                                ? "hsl(142 71% 55%)"
                                : `hsl(${participantColors.get(message.handle) ?? 210} 75% 68%)`
                            return <article
                                key={message.id}
                                style={{
                                    borderColor: isOwnMessage
                                        ? "rgb(74 222 128 / 20%)"
                                        : `hsl(${participantColors.get(message.handle) ?? 210} 75% 68% / 25%)`,
                                    backgroundColor: isOwnMessage
                                        ? "rgb(74 222 128 / 8%)"
                                        : `hsl(${participantColors.get(message.handle) ?? 210} 75% 68% / 7%)`,
                                }}
                                className={`min-w-0 max-w-[92%] rounded-2xl border px-3.5 py-2.5 sm:max-w-[80%] ${isOwnMessage ? "ml-auto" : ""}`}
                            >
                                <div className="mb-1 flex items-center gap-2 text-[11px]">
                                    <span className="font-semibold" style={{ color: senderColor }}>
                                        {message.handle}
                                    </span>
                                    {message.time && (
                                        <span className="hidden text-white/30 sm:inline" title={`${message.time} UTC`}>
                                            {message.time}
                                        </span>
                                    )}
                                    {message.delivery && (
                                        <span className="ml-auto text-[10px] text-white/45" role="status">
                                            {message.delivery === "queued" && "Queued"}
                                            {message.delivery === "sending" && "Sending…"}
                                            {message.delivery === "unconfirmed" && (
                                                <>
                                                    Not confirmed
                                                    <button
                                                        type="button"
                                                        onClick={() => retryMessage(message.id)}
                                                        className="ml-2 cursor-pointer text-green-300 underline underline-offset-2"
                                                    >
                                                        Retry
                                                    </button>
                                                </>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <p className="whitespace-pre-wrap break-words leading-6 text-white/85">{message.text}</p>
                            </article>
                        })}
                    </div>
                    <div ref={bottom} />
                </div>
            </section>

            <footer className="w-full min-w-0 shrink-0 overflow-x-clip border-t border-white/10 bg-[#0b100d] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="mx-auto w-full min-w-0 max-w-5xl">
                    <div className="flex min-w-0 items-end gap-2">
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
                            aria-label="Message"
                            className="max-h-28 min-h-11 w-0 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-base leading-6 text-white caret-green-400 outline-none placeholder:text-white/30 focus:border-green-400/50 sm:text-sm"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={!text.trim()}
                            aria-label="Send message"
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-green-400 px-3 text-sm font-semibold text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                        >
                            <Send size={16} />
                            <span className="hidden sm:inline">Send</span>
                        </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-white/35">
                        <span className="truncate">Enter to send · Shift+Enter for a new line</span>
                        <span className="ml-3 shrink-0">{text.length}/4000</span>
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