import axios from "axios"

const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "")

export function apiUrl(path: string) {
    return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`
}

export function webSocketUrl(path: string) {
    const url = new URL(apiUrl(path))
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    return url.toString()
}

export async function joinRoom<T>(
    roomCode: string,
    username: string,
    onRetry?: (attempt: number) => void
) {
    const maxRetries = 5

    for (let attempt = 0; ; attempt++) {
        try {
            return await axios.post<T>(apiUrl(`/api/rooms/${roomCode}/join/`), { username })
        } catch (error) {
            const data: unknown = axios.isAxiosError(error) ? error.response?.data : null
            const isPreviousConnectionClosing =
                axios.isAxiosError(error) &&
                error.response?.status === 409 &&
                data !== null &&
                typeof data === "object" &&
                "error" in data &&
                data.error === "This username is still connected to the room."

            if (!isPreviousConnectionClosing || attempt >= maxRetries) throw error

            onRetry?.(attempt + 1)
            await new Promise((resolve) => window.setTimeout(resolve, 600))
        }
    }
}

export function apiErrorMessage(error: unknown, fallback: string) {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error ? error.message : fallback
    }

    const data: unknown = error.response?.data
    if (typeof data === "string") return data
    if (data && typeof data === "object") {
        const values = data as Record<string, unknown>
        for (const key of ["error", "detail", "message"]) {
            if (typeof values[key] === "string") return values[key]
        }
        const first = Object.values(values)[0]
        if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    }
    return error.message || fallback
}
