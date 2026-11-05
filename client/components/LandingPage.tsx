'use client'
import Image from "next/image";
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import img from "@/public/darkimage.jpg";
import PrincipleSection from "./PrincipleSection";
import Manifesto from "./Manifesto";
import CreateRoom from "./CreateRoom";
import EnterRoom from "./EnterRoom";
import { useEffect, useState } from "react";
import HowItWorks from "./HowItWorks";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", display: "swap" });
const sans = DM_Sans({ subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap" });

const TERMINAL_LINES = [
    "A room. A link. A conversation.",
    "Encrypted text sessions that disappear when you're done.",
    "No accounts. No footprints. No looking back.",
];

/** Types the given lines out one character at a time. */
const useTyped = (lines: string[], speed = 24, delay = 600) => {
    const total = lines.reduce((n, l) => n + l.length, 0);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setCount(total);
            return;
        }
        let interval: ReturnType<typeof setInterval> | undefined;
        const start = setTimeout(() => {
            interval = setInterval(() => {
                setCount((c) => {
                    if (c >= total && interval) clearInterval(interval);
                    return Math.min(c + 1, total);
                });
            }, speed);
        }, delay);
        return () => {
            clearTimeout(start);
            if (interval) clearInterval(interval);
        };
    }, [total, speed, delay]);

    let remaining = count;
    return lines.map((l) => {
        const typed = l.slice(0, Math.max(0, remaining));
        remaining -= l.length;
        return typed;
    });
};

const HACKER_CSS = `
@keyframes hx-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
.hx-blink { animation: hx-blink 1s steps(1) infinite; }
@keyframes hx-glitch {
  0%,92%,100% { transform: none; text-shadow: 0 0 22px rgba(0,255,102,.45); }
  93% { transform: translate(-3px,0); text-shadow: 3px 0 #ff2bd6, -3px 0 #00e5ff, 0 0 22px rgba(0,255,102,.45); }
  95% { transform: translate(3px,1px); text-shadow: -3px 0 #ff2bd6, 3px 0 #00e5ff, 0 0 22px rgba(0,255,102,.45); }
  97% { transform: translate(-1px,-1px); text-shadow: 1px 0 #00e5ff, -1px 0 #ff2bd6, 0 0 22px rgba(0,255,102,.45); }
}
.hx-glitch { animation: hx-glitch 6s infinite; text-shadow: 0 0 22px rgba(0,255,102,.45); }
@media (prefers-reduced-motion: reduce) { .hx-blink, .hx-glitch { animation: none; } }
`;

type Message = { from: "them" | "you"; text: string };

const MESSAGES: Message[] = [
    { from: "them", text: "Meet at the north entrance. 7:40." },
    { from: "you", text: "On my way. Sending the details now." },
    { from: "them", text: "Got them. Closing this room." },
];

type Phase = "live" | "fading" | "closed";

const FACTS = [
    { title: "Nothing is kept", body: "Messages live only while the room is open, then they're gone." },
    { title: "No account", body: "Share a link. That's all anyone needs to join." },
    { title: "Text only", body: "Encrypted conversation with nothing else attached." },
];

/** Decorative preview: a conversation that appears, then dissolves. */
const RoomPreview = () => {
    const [visible, setVisible] = useState(0);
    const [phase, setPhase] = useState<Phase>("live");

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setVisible(MESSAGES.length);
            return;
        }

        const timers: ReturnType<typeof setTimeout>[] = [];
        const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

        const run = () => {
            setPhase("live");
            setVisible(0);
            at(700, () => setVisible(1));
            at(2000, () => setVisible(2));
            at(3400, () => setVisible(3));
            at(6200, () => setPhase("fading"));
            at(7800, () => setPhase("closed"));
            at(11500, run);
        };

        run();
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div
            aria-hidden="true"
            className="relative w-full max-w-md rounded-3xl border border-[#00ff66]/20 bg-white/[0.03] shadow-[0_40px_120px_-40px_rgba(0,255,102,0.3)] backdrop-blur-xl lg:ml-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2.5 text-sm text-white/80">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff66] opacity-50 motion-reduce:animate-none" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff66]" />
                    </span>
                    Private room
                </div>
                <span className="text-xs text-white/40">2 people here</span>
            </div>

            {/* Messages */}
            <div className="relative flex h-[290px] flex-col gap-3 px-5 py-6">
                {MESSAGES.map((m, i) => {
                    const shown = phase === "live" && i < visible;
                    const state = shown
                        ? "translate-y-0 opacity-100 blur-0"
                        : phase === "live"
                            ? "translate-y-2 opacity-0 blur-0"
                            : "-translate-y-1 opacity-0 blur-md";

                    return (
                        <div
                            key={i}
                            style={{ transitionDelay: phase === "fading" ? `${i * 220}ms` : "0ms" }}
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 transition-all duration-700 ease-out motion-reduce:transition-none ${state} ${m.from === "you"
                                    ? "self-end rounded-br-md bg-[#00ff66] text-[#03130A]"
                                    : "self-start rounded-bl-md bg-white/[0.07] text-white/85"
                                }`}
                        >
                            {m.text}
                        </div>
                    );
                })}

                <div
                    className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-1000 ${phase === "closed" ? "opacity-100" : "opacity-0"
                        }`}
                >
                    <p className={`${serif.className} text-3xl text-white/90`}>Room closed</p>
                    <p className="mt-1.5 text-sm text-white/40">Nothing was saved.</p>
                </div>
            </div>

            {/* Fake input */}
            <div className="border-t border-white/[0.07] p-4">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-white/30">
                    Write a message
                    <span className="h-5 w-5 rounded-full bg-white/10" />
                </div>
            </div>
        </div>
    );
};

const LandingPage = () => {
    const [showCreateRoom, setShowCreateRoom] = useState<boolean>(false);
    const [showEnterRoom, setShowEnterRoom] = useState<boolean>(false);
    const typed = useTyped(TERMINAL_LINES);
    const firstUnfinished = typed.findIndex((t, i) => t.length < TERMINAL_LINES[i].length);
    const activeLine = firstUnfinished === -1 ? TERMINAL_LINES.length - 1 : firstUnfinished;

    return (
        <>
            <style>{HACKER_CSS}</style>
            <main className={`${sans.className} relative overflow-hidden bg-[#05070A] text-[#EDEFF3]`}>
                <section
                    id="top"
                    className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden"
                >
                    {/* Background */}
                    <div className="pointer-events-none absolute inset-0">
                        <Image
                            src={img}
                            alt=""
                            fill
                            priority
                            className="object-cover object-center opacity-20 md:object-[65%_center] md:opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#05070A] via-[#05070A]/80 to-[#05070A]/40" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#05070A] via-transparent to-[#05070A]/50" />
                        <div
                            className="absolute inset-0 opacity-[0.06]"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(0deg, #00ff66 0px, #00ff66 1px, transparent 1px, transparent 3px)",
                            }}
                        />
                        <div className="absolute -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-[#00ff66]/[0.08] blur-[140px]" />
                    </div>

                    <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
                        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
                            {/* Copy */}
                            <div className={`${mono.className} max-w-2xl`}>
                                <h1 className="text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl xl:text-7xl">
                                    <span className="hx-glitch block text-[#00ff66]">Talk freely.</span>
                                    <span className="block text-[#00ff66]/35">Leave nothing behind.</span>
                                </h1>

                                <div className="mt-8 max-w-xl border-l border-[#00ff66]/30 pl-5 text-sm leading-7 text-[#00ff66]/70 sm:text-base">
                                    {TERMINAL_LINES.map((line, i) => (
                                        <p key={line} className="relative">
                                            <span className="opacity-0">&gt; {line}</span>
                                            <span aria-hidden="true" className="absolute inset-0">
                                                <span className="text-[#00ff66]/40">&gt; </span>
                                                {typed[i]}
                                                {i === activeLine && (
                                                    <span className="hx-blink ml-0.5 inline-block h-[1em] w-[0.55ch] translate-y-[0.15em] bg-[#00ff66]" />
                                                )}
                                            </span>
                                        </p>
                                    ))}
                                </div>

                                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={() => setShowCreateRoom(true)}
                                        className="min-h-12 cursor-pointer rounded-md border border-[#00ff66] bg-[#00ff66] px-7 py-3 text-xs font-bold tracking-[0.2em] text-black transition duration-300 hover:bg-[#00ff66]/90 hover:shadow-[0_0_30px_rgba(0,255,102,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff66] sm:min-w-52"
                                    >
                                        CREATE_ROOM
                                    </button>

                                    <button
                                        onClick={() => setShowEnterRoom(true)}
                                        className="min-h-12 cursor-pointer rounded-md border border-[#00ff66]/40 bg-transparent px-7 py-3 text-xs font-bold tracking-[0.2em] text-[#00ff66] transition duration-300 hover:border-[#00ff66] hover:bg-[#00ff66]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff66] sm:min-w-52"
                                    >
                                        ENTER_ROOM
                                    </button>
                                </div>
                            </div>

                            {/* Live preview */}
                            <RoomPreview />
                        </div>

                        {/* Facts */}
                        <dl className={`${mono.className} mt-20 grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-3 sm:gap-10`}>
                            {FACTS.map((f) => (
                                <div key={f.title}>
                                    <dt className="text-sm text-[#00ff66]">// {f.title}</dt>
                                    <dd className="mt-1.5 max-w-xs text-xs leading-6 text-white/45">{f.body}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {showCreateRoom && <CreateRoom onClose={() => setShowCreateRoom(false)} />}
                {showEnterRoom && <EnterRoom onClose={() => setShowEnterRoom(false)} />}

                {/* ========== how it works section ========== */}
                <HowItWorks />

                {/* ========== principle section ========== */}
                <PrincipleSection />

                {/* ========== manifesto section ========== */}
                <Manifesto />
            </main>
        </>
    );
};

export default LandingPage;