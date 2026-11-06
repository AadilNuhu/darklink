"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { Send, Settings, X } from "lucide-react"
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

// GET /api/rooms/{code}/messages/
type HistoryResponse = {
    count: number
    page: number
    page_size: number
    results: HistoryMessage[]
}

// GET /api/rooms/{code}/members/
type MembersResponse = {
    joined_usernames: string[]
    online_usernames: string[]
}

// GET /api/rooms/{code}/members/count/
type MemberCountResponse = {
    joined_count: number
    online_count: number
}

// PATCH /api/rooms/{code}/admin/ returns room_details(room), or {"ended": true}
type UpdateRoomResponse = {
    ended?: boolean
    end_time?: string | null
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

const HISTORY_PAGE_SIZE = 100 // the server caps page_size at 100
const MEMBERS_POLL_MS = 10_000

function clearRoomSession() {
    SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key))
}

function errorStatus(error: unknown): number | undefined {
    return axios.isAxiosError(error) ? error.response?.status : undefined
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

    // Member state (GET members/ and members/count/)
    const [members, setMembers] = useState<MembersResponse>({ joined_usernames: [], online_usernames: [] })
    const [counts, setCounts] = useState<{ joined: number; online: number } | null>(null)
    const [membersError, setMembersError] = useState("")

    // Admin state
    const [panelOpen, setPanelOpen] = useState(false)
    const [limitInput, setLimitInput] = useState("")
    const [endInput, setEndInput] = useState("")
    const [settingsBusy, setSettingsBusy] = useState(false)
    const [memberBusy, setMemberBusy] = useState<string | null>(null)
    const [adminNotice, setAdminNotice] = useState<{ username: string; code: string } | null>(null)
    const [adminInfo, setAdminInfo] = useState("")
    const [selectedMember, setSelectedMember] = useState<string | null>(null)

    // Screenshot deterrent state
    const [shielded, setShielded] = useState(false)

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
    const rootRef = useRef<HTMLElement>(null)
    const [keyboardOpen, setKeyboardOpen] = useState(false)

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

    // Keeps the layout sized to the visible area so the input sits above the mobile keyboard
    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return

        const html = document.documentElement
        const prevOverflow = html.style.overflow
        html.style.overflow = "hidden"

        const update = () => {
            const el = rootRef.current
            if (!el) return
            el.style.height = `${vv.height}px`
            el.style.transform = `translateY(${vv.offsetTop}px)`
            setKeyboardOpen(window.innerHeight - vv.height > 120)
            window.scrollTo(0, 0)
            bottom.current?.scrollIntoView({ block: "end" })
        }

        update()
        vv.addEventListener("resize", update)
        vv.addEventListener("scroll", update)
        return () => {
            vv.removeEventListener("resize", update)
            vv.removeEventListener("scroll", update)
            html.style.overflow = prevOverflow
        }
    }, [])

    // Screenshot deterrents (best effort only: browsers cannot truly block screenshots)
    useEffect(() => {
        const onVisibility = () => setShielded(document.hidden)
        const onBlur = () => setShielded(true)
        const onFocus = () => setShielded(false)
        const onKeyDown = (event: KeyboardEvent) => {
            const macShot =
                event.metaKey &&
                event.shiftKey &&
                ["Digit3", "Digit4", "Digit5"].includes(event.code)
            if (event.key === "PrintScreen" || macShot) {
                setShielded(true)
                navigator.clipboard?.writeText("").catch(() => {})
                window.setTimeout(() => setShielded(false), 1500)
            }
        }
        const onContextMenu = (event: Event) => event.preventDefault()

        document.addEventListener("visibilitychange", onVisibility)
        window.addEventListener("blur", onBlur)
        window.addEventListener("focus", onFocus)
        window.addEventListener("keydown", onKeyDown)
        document.addEventListener("contextmenu", onContextMenu)
        return () => {
            document.removeEventListener("visibilitychange", onVisibility)
            window.removeEventListener("blur", onBlur)
            window.removeEventListener("focus", onFocus)
            window.removeEventListener("keydown", onKeyDown)
            document.removeEventListener("contextmenu", onContextMenu)
        }
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

        // History is ordered oldest-first and paginated, so page 1 is the *oldest* messages.
        // Load the last two pages so the most recent messages are always included.
        const loadHistory = async (roomCodeForHistory: string, historyUsername: string) => {
            const url = apiUrl(`/api/rooms/${roomCodeForHistory}/messages/`)
            const fetchPage = (page: number) =>
                axios.get<HistoryResponse>(url, {
                    params: { username: historyUsername, page, page_size: HISTORY_PAGE_SIZE },
                })

            const first = await fetchPage(1)
            const lastPage = Math.max(1, Math.ceil(first.data.count / HISTORY_PAGE_SIZE))
            if (lastPage === 1) return first.data.results

            const wanted = lastPage > 2 ? [lastPage - 1, lastPage] : [lastPage]
            const pages = await Promise.all(wanted.map(fetchPage))
            return pages.flatMap((page) => page.data.results)
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

            const inviteUsername = new URLSearchParams(window.location.search)
                .get("u")
                ?.trim() || null
            if (sessionStorage.getItem("dl-left-room") === "1" && !inviteUsername) {
                router.replace("/")
                return
            }
            if (inviteUsername) sessionStorage.removeItem("dl-left-room")

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
                    inviteUsername ||
                    null
                if (!activeUsername) {
                    router.replace("/")
                    return
                }
                joinUsername.current = activeUsername

                // POST /api/rooms/{code}/join/ -> 200 | 404 | 409 | 410
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
                        const status = errorStatus(error)
                        if (status === 410) {
                            notifyRoomEnded("This room has ended. You’ll be returned to the home page.")
                            return
                        }
                        setRoomError(apiErrorMessage(error, "Unable to join this room."))
                        setConnectionStatus("disconnected")
                        // 4xx answers (not found, full, name taken) will not fix themselves,
                        // so only auto-retry network failures, rate limits and server errors.
                        // The Reconnect button is still available for a manual retry.
                        if (!status || status >= 500 || status === 429) scheduleReconnect()
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
                const historyRoomCode = activeRoomCode as string
                const historyUsername = activeUsername as string
                loadHistory(historyRoomCode, historyUsername).then((results) => {
                    if (cancelled) return
                    results.forEach((message) =>
                        confirmOutgoingMessage(message.username, message.content)
                    )
                    const history = results.map((message) => ({
                        id: message.id,
                        time: formatMessageTime(message.datetime),
                        handle: message.username,
                        text: message.content,
                    }))
                    setMessages((current) => mergeMessages(current, history))
                }).catch((error: unknown) => {
                    if (cancelled) return
                    if (errorStatus(error) === 410) {
                        notifyRoomEnded("This room has ended. You’ll be returned to the home page.")
                        return
                    }
                    setHistoryError(apiErrorMessage(error, "Unable to load message history."))
                })
                flushQueuedMessages()
            }

            socket.onclose = (event) => {
                // Close code 4403 means the server removed this user from the room
                if (event.code === 4403 && !cancelled) {
                    notifyRoomEnded("You were removed from this room by an admin.")
                    return
                }
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
                    if (
                        (envelope.type === "member_removed" || envelope.type === "removed") &&
                        envelope.username === activeUsername
                    ) {
                        notifyRoomEnded("You were removed from this room by an admin.")
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

    // ---- Members ----
    // GET /api/rooms/{room_code}/members/        -> { joined_usernames, online_usernames }
    // GET /api/rooms/{room_code}/members/count/  -> { joined_count, online_count }
    // Everyone gets the cheap count; the admin panel loads the full list while it is open.
    const refreshMembers = useCallback(async (includeList: boolean) => {
        if (!roomCode) return
        try {
            if (includeList) {
                const response = await axios.get<MembersResponse>(
                    apiUrl(`/api/rooms/${roomCode}/members/`)
                )
                setMembers(response.data)
                setCounts({
                    joined: response.data.joined_usernames.length,
                    online: response.data.online_usernames.length,
                })
            } else {
                const response = await axios.get<MemberCountResponse>(
                    apiUrl(`/api/rooms/${roomCode}/members/count/`)
                )
                setCounts({
                    joined: response.data.joined_count,
                    online: response.data.online_count,
                })
            }
            setMembersError("")
        } catch (error) {
            if (errorStatus(error) === 410) {
                notifyRoomEnded("This room has ended. You’ll be returned to the home page.")
                return
            }
            if (includeList) setMembersError(apiErrorMessage(error, "Unable to load members."))
        }
    }, [roomCode, notifyRoomEnded])

    const listOpen = role === "A" && panelOpen
    useEffect(() => {
        if (!roomCode || connectionStatus !== "connected") return
        void refreshMembers(listOpen)
        const timer = window.setInterval(() => void refreshMembers(listOpen), MEMBERS_POLL_MS)
        return () => window.clearInterval(timer)
    }, [roomCode, connectionStatus, listOpen, refreshMembers])

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

    // ---- Admin tools ----
    // Every admin endpoint expects X-Admin-Username and X-Admin-Code headers.
    const adminHeaders = useCallback(() => ({
        "X-Admin-Username": username,
        "X-Admin-Code": sessionStorage.getItem("dl-admin-code") || "",
    }), [username])

    // PATCH /api/rooms/{room_code}/admin/  {"limit": 8} and/or {"end_time": "...Z"}
    // -> room_details | {"ended": true} (end time already passed) | 400 | 403 | 410
    const saveSettings = async () => {
        const body: Record<string, unknown> = {}
        if (limitInput.trim()) {
            const limit = Number(limitInput)
            if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
                setActionError("Member limit must be a whole number between 1 and 20.")
                return
            }
            body.limit = limit
        }
        if (endInput) {
            const date = new Date(endInput)
            if (Number.isNaN(date.getTime())) {
                setActionError("Enter a valid end time.")
                return
            }
            body.end_time = date.toISOString()
        }
        if (Object.keys(body).length === 0) return
        setSettingsBusy(true)
        setActionError("")
        setAdminInfo("")
        try {
            const response = await axios.patch<UpdateRoomResponse>(
                apiUrl(`/api/rooms/${roomCode}/admin/`),
                body,
                { headers: adminHeaders() }
            )
            if (response.data?.ended) {
                notifyRoomEnded("The room end time has passed. You’ll be returned to the home page.")
                return
            }
            const savedEndTime = typeof response.data?.end_time === "string"
                ? response.data.end_time
                : typeof body.end_time === "string"
                    ? body.end_time
                    : null
            if (savedEndTime) {
                sessionStorage.setItem("dl-end-time", savedEndTime)
                setEndTime(savedEndTime)
                setNow(Date.now())
            }
            setLimitInput("")
            setEndInput("")
            setAdminInfo("Settings saved.")
        } catch (error) {
            if (errorStatus(error) === 410) {
                notifyRoomEnded("This room has ended. You’ll be returned to the home page.")
                return
            }
            setActionError(apiErrorMessage(error, "Unable to update room settings."))
        } finally {
            setSettingsBusy(false)
        }
    }

    // POST /api/rooms/{room_code}/admin/members/{username}/promote/ -> { username, admin_code }
    // POST /api/rooms/{room_code}/admin/members/{username}/revoke/  -> 204
    const changeAdmin = async (target: string, action: "promote" | "revoke") => {
        setMemberBusy(target)
        setActionError("")
        setAdminInfo("")
        setAdminNotice(null)
        try {
            const response = await axios.post<{ username: string; admin_code?: string }>(
                apiUrl(`/api/rooms/${roomCode}/admin/members/${encodeURIComponent(target)}/${action}/`),
                null,
                { headers: adminHeaders() }
            )
            if (action === "promote" && response.data.admin_code) {
                // The server only returns the new admin's code once.
                setAdminNotice({ username: target, code: response.data.admin_code })
            }
            if (action === "revoke") {
                setAdminInfo(`Admin access revoked for ${target}.`)
                if (target === username) {
                    // The current admin demoted themselves.
                    sessionStorage.setItem("dl-role", "U")
                    sessionStorage.removeItem("dl-admin-code")
                    setRole("U")
                    setPanelOpen(false)
                    return
                }
            }
            await refreshMembers(true)
        } catch (error) {
            if (errorStatus(error) === 410) {
                notifyRoomEnded("This room has ended. You’ll be returned to the home page.")
                return
            }
            setActionError(apiErrorMessage(
                error,
                action === "promote" ? "Unable to promote this member." : "Unable to revoke admin access."
            ))
        } finally {
            setMemberBusy(null)
        }
    }

    // End and delete the room: DELETE /api/rooms/{room_code}/admin/end/
    const leaveRoom = async () => {
        setActionError("")
        if (role === "A") {
            if (!window.confirm("End and delete this room for everyone?")) return
            setIsEnding(true)
            try {
                await axios.delete(apiUrl(`/api/rooms/${roomCode}/admin/end/`), {
                    headers: adminHeaders(),
                })
            } catch (error) {
                // 410 means the room had already expired, so the end goal is met anyway.
                if (errorStatus(error) !== 410) {
                    setActionError(apiErrorMessage(error, "Unable to end the room."))
                    setIsEnding(false)
                    return
                }
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
        ? "text-red-400"
        : "text-white/70"

    const dotColor =
        connectionStatus === "connected" ? "bg-green-400"
            : connectionStatus === "connecting" ? "bg-yellow-400"
                : "bg-red-500"
    const statusText =
        connectionStatus === "connected" ? (counts ? `${counts.online} online` : "")
            : connectionStatus === "connecting" ? "connecting…"
                : "offline"

    const timerText = remaining !== null
        ? formatCountdown(remaining)
        : duration ? `${duration}m` : null

    const errorText = roomError || historyError || actionError
    const onlineSet = new Set(members.online_usernames)

    return (
        <main
            ref={rootRef}
            className="fixed inset-x-0 top-0 flex h-[100dvh] min-h-0 w-full min-w-0 max-w-full select-none flex-col overflow-x-clip overflow-y-hidden bg-[#070a08] font-mono text-sm text-green-400 selection:bg-green-400 selection:text-black"
        >
            <style>{`@media print { body { display: none !important; } }`}</style>

            {shielded && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-xs text-green-700">
                    Content hidden for privacy
                </div>
            )}

            <header className="shrink-0 border-b border-white/10 bg-[#0b100d] px-4 py-3 text-xs sm:px-6">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span
                            title={connectionStatus}
                            className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`}
                        />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-wide text-white">darklynk</p>
                            {statusText && (
                                <p className="truncate text-[11px] text-white/40">{statusText}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {timerText && (
                            <span
                                title={endTime || "Room timer starts when everyone joins."}
                                className={`tabular-nums ${timerColor}`}
                            >
                                {timerText}
                            </span>
                        )}
                        {role === "A" && (
                            <button
                                type="button"
                                onClick={() => setPanelOpen(true)}
                                aria-label="Room settings"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-green-300"
                            >
                                <Settings size={16} aria-hidden="true" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={leaveRoom}
                            disabled={isEnding}
                            className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-white/75 transition hover:border-green-400/40 hover:text-green-300 disabled:cursor-wait disabled:opacity-50"
                        >
                            {isEnding ? "Closing…" : role === "A" ? "End" : "Leave"}
                        </button>
                    </div>
                </div>
            </header>

            <section className="min-h-0 min-w-0 w-full flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                <div className="mx-auto w-full min-w-0 max-w-5xl">
                    {errorText && (
                        <p role="alert" className="mb-4 break-words rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-300">
                            {errorText}
                            {connectionStatus === "disconnected" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoomError("")
                                        reconnectAttempt.current = 0
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
                        <p className="py-16 text-center text-xs text-white/30">
                            No messages yet
                        </p>
                    )}

                    <div className="space-y-2.5">
                        {messages.map((message) => {
                            const isOwnMessage = message.handle === username
                            if (message.system) {
                                return (
                                    <p key={message.id} className="whitespace-pre-wrap break-words rounded-lg bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
                                        {message.text}
                                    </p>
                                )
                            }
                            const hue = participantColors.get(message.handle) ?? 210
                            return (
                                <article
                                    key={message.id}
                                    title={message.time || undefined}
                                    className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%] ${isOwnMessage ? "ml-auto items-end" : "items-start"}`}
                                >
                                    {!isOwnMessage && (
                                        <span
                                            className="mb-0.5 px-1 text-[11px] font-semibold"
                                            style={{ color: `hsl(${hue} 75% 68%)` }}
                                        >
                                            {message.handle}
                                        </span>
                                    )}
                                    <div
                                        style={{
                                            backgroundColor: isOwnMessage
                                                ? "rgb(74 222 128 / 14%)"
                                                : `hsl(${hue} 75% 68% / 10%)`,
                                        }}
                                        className="min-w-0 rounded-2xl px-3.5 py-2"
                                    >
                                        <p className="whitespace-pre-wrap break-words leading-6 text-white/90">{message.text}</p>
                                    </div>
                                    {message.delivery && (
                                        <span className="mt-0.5 px-1 text-[10px] text-white/40" role="status">
                                            {message.delivery === "queued" && "Queued"}
                                            {message.delivery === "sending" && "Sending…"}
                                            {message.delivery === "unconfirmed" && (
                                                <>
                                                    Not sent
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
                                </article>
                            )
                        })}
                    </div>

                    <div ref={bottom} />
                </div>
            </section>

            <footer
                style={{ paddingBottom: keyboardOpen ? "0.75rem" : "max(0.75rem, env(safe-area-inset-bottom))" }}
                className="w-full min-w-0 shrink-0 overflow-x-clip border-t border-white/10 bg-[#0b100d] px-4 pt-3 sm:px-6"
            >
                <div className="mx-auto w-full min-w-0 max-w-5xl">
                    <div className="flex min-w-0 items-end gap-2">
                        <textarea
                            id="message"
                            value={text}
                            rows={1}
                            maxLength={4000}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={connectionStatus === "connected" ? "Message" : "Offline"}
                            onChange={(event) => {
                                setText(event.target.value)
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault()
                                    sendMessage()
                                }
                            }}
                            aria-label="Message"
                            className="max-h-28 min-h-11 w-0 min-w-0 flex-1 select-text resize-none rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-base leading-6 text-white caret-green-400 outline-none placeholder:text-white/30 focus:bg-white/[0.07] sm:text-sm"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={!text.trim()}
                            aria-label="Send message"
                            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-green-400 text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    {text.length > 3500 && (
                        <p className="mt-1.5 text-right text-[10px] text-white/40">{text.length}/4000</p>
                    )}
                </div>
            </footer>

            {role === "A" && panelOpen && (
                <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#0b100d] shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="font-semibold text-white">Settings</span>
                        <button
                            type="button"
                            onClick={() => setPanelOpen(false)}
                            aria-label="Close settings panel"
                            className="cursor-pointer text-white/60 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-3 px-4 pb-4 text-xs">
                        <label className="block">
                            <span className="mb-1 block text-white/50">Member limit</span>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={limitInput}
                                onChange={(event) => setLimitInput(event.target.value)}
                                placeholder="1-20"
                                className="w-full select-text rounded-lg bg-white/[0.05] px-3 py-2.5 text-base text-white outline-none placeholder:text-white/25 focus:bg-white/[0.07] sm:text-xs"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-white/50">End time</span>
                            <input
                                type="datetime-local"
                                value={endInput}
                                onChange={(event) => setEndInput(event.target.value)}
                                className="w-full select-text rounded-lg bg-white/[0.05] px-3 py-2.5 text-base text-white outline-none focus:bg-white/[0.07] sm:text-xs"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={saveSettings}
                            disabled={settingsBusy || (!limitInput.trim() && !endInput)}
                            className="w-full cursor-pointer rounded-lg bg-green-400 px-3 py-2.5 font-semibold text-black disabled:opacity-40"
                        >
                            {settingsBusy ? "Saving…" : "Save"}
                        </button>
                        {adminInfo && (
                            <p role="status" className="text-green-300">{adminInfo}</p>
                        )}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col border-t border-white/10 px-4 pt-3 text-xs">
                        <p className="mb-2 text-white/50">
                            Members{counts ? ` · ${counts.online} online of ${counts.joined}` : ""}
                        </p>

                        {membersError && (
                            <p role="alert" className="mb-2 rounded-lg bg-red-400/10 px-3 py-2 text-red-300">
                                {membersError}
                            </p>
                        )}

                        {adminNotice && (
                            <div className="mb-2 select-text break-all rounded-lg bg-amber-300/10 px-3 py-2 text-amber-200">
                                <p className="font-semibold">{adminNotice.username} is now an admin</p>
                                <p className="mt-1">
                                    Code: <span className="text-white">{adminNotice.code}</span>
                                </p>
                                <p className="mt-1 text-[10px] text-amber-200/70">
                                    Shown once. Share it privately.
                                </p>
                            </div>
                        )}

                        <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto overscroll-contain pb-4">
                            {members.joined_usernames.map((name) => {
                                const online = onlineSet.has(name)
                                const open = selectedMember === name
                                return (
                                    <li key={name} className="py-1">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMember(open ? null : name)}
                                            className="flex w-full cursor-pointer items-center gap-2.5 py-2 text-left"
                                        >
                                            <span
                                                className={`h-2 w-2 shrink-0 rounded-full ${online ? "bg-green-400" : "bg-white/25"}`}
                                            />
                                            <span className="min-w-0 flex-1 truncate text-white/85">
                                                {name}
                                                {name === username && <span className="ml-1 text-white/35">(you)</span>}
                                            </span>
                                        </button>
                                        {open && (
                                            <div className="flex gap-2 pb-2 pl-[18px]">
                                                <button
                                                    type="button"
                                                    disabled={memberBusy !== null}
                                                    onClick={async () => {
                                                        await changeAdmin(name, "promote")
                                                        setSelectedMember(null)
                                                    }}
                                                    className="cursor-pointer rounded-lg bg-white/[0.06] px-3 py-1.5 text-white/80 hover:text-green-300 disabled:cursor-wait disabled:opacity-40"
                                                >
                                                    {memberBusy === name ? "…" : "Make admin"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={memberBusy !== null}
                                                    onClick={async () => {
                                                        await changeAdmin(name, "revoke")
                                                        setSelectedMember(null)
                                                    }}
                                                    className="cursor-pointer rounded-lg bg-white/[0.06] px-3 py-1.5 text-white/80 hover:text-red-300 disabled:cursor-wait disabled:opacity-40"
                                                >
                                                    Remove admin
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                            {members.joined_usernames.length === 0 && !membersError && (
                                <li className="py-2 text-white/35">No members yet</li>
                            )}
                        </ul>
                    </div>
                </aside>
            )}
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