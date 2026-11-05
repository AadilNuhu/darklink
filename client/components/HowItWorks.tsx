'use client'
import { useEffect, useRef, useState } from "react";
import { JetBrains_Mono } from "next/font/google";

const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap" });

type Step = {
    title: string;
    body: string;
    command: string;
    output: string[];
};

// NOTE: terminal output is illustrative. Adjust the wording so it matches
// what your app actually does (link format, encryption details, etc.).
const STEPS: Step[] = [
    {
        title: "Create a room",
        body: "One click. No sign-up, no profile, nothing to fill in.",
        command: "./create_room",
        output: ["generating room...", "encrypting channel...", "room ready: /r/k7x2-m9fa"],
    },
    {
        title: "Share the link",
        body: "Send the link to whoever you want in. They join straight from it.",
        command: "./share --link",
        output: ["link copied to clipboard", "waiting for someone to join...", "1 person connected"],
    },
    {
        title: "Talk",
        body: "Plain, encrypted text. No files, no extras, nothing to track you.",
        command: "./chat",
        output: ["[them] you there?", "[you]  yes. go ahead.", "nothing is being saved"],
    },
    {
        title: "Leave",
        body: "When the room closes, the conversation goes with it.",
        command: "./close_room",
        output: ["room closed", "messages purged", "0 bytes kept"],
    },
];

const Terminal = ({ step }: { step: Step }) => {
    const [shown, setShown] = useState(0);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setShown(step.output.length);
            return;
        }
        setShown(0);
        const timers = step.output.map((_, i) =>
            setTimeout(() => setShown(i + 1), 450 + i * 600),
        );
        return () => timers.forEach(clearTimeout);
    }, [step]);

    return (
        <div className="overflow-hidden rounded-xl border border-[#00ff66]/20 bg-black/60 shadow-[0_0_80px_-30px_rgba(0,255,102,0.35)] backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-[#00ff66]/15 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-xs text-white/35">session</span>
            </div>

            <div className="min-h-[220px] space-y-2 px-5 py-6 text-sm leading-6 sm:text-[0.95rem]">
                <p className="text-white/40">
                    <span className="text-[#00ff66]">root@room</span>:~$ <span className="text-white/85">{step.command}</span>
                </p>
                {step.output.map((line, i) => (
                    <p
                        key={line}
                        className={`text-[#00ff66]/75 transition-opacity duration-300 ${i < shown ? "opacity-100" : "opacity-0"}`}
                    >
                        <span className="text-[#00ff66]/35">&gt; </span>
                        {line}
                    </p>
                ))}
                <span className="inline-block h-[1.1em] w-[0.55ch] translate-y-[0.2em] animate-pulse bg-[#00ff66] motion-reduce:animate-none" />
            </div>
        </div>
    );
};

const HowItWorks = () => {
    const [active, setActive] = useState(0);
    const [manual, setManual] = useState(false);
    const [inView, setInView] = useState(false);
    const ref = useRef<HTMLElement>(null);

    // Only auto-play while the section is on screen and the person hasn't picked a step.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (manual || !inView) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 6000);
        return () => clearInterval(id);
    }, [manual, inView]);

    const pick = (i: number) => {
        setManual(true);
        setActive(i);
    };

    return (
        <section
            id="how-it-works"
            ref={ref}
            className={`${mono.className} relative overflow-hidden border-t border-white/[0.06] bg-[#05070A] px-5 py-24 text-white sm:px-8 lg:px-12`}
        >
            <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#00ff66]/[0.06] blur-[140px]" />

            <div className="relative mx-auto max-w-7xl">
                <h2 className="max-w-2xl text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                    Four steps. <span className="text-[#00ff66]/40">Then it&apos;s gone.</span>
                </h2>
                <p className="mt-5 max-w-md text-sm leading-7 text-white/50">
                    This is the whole life of a room, from the first click to the last message.
                </p>

                <div className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
                    {/* Steps */}
                    <ol className="flex flex-col gap-2">
                        {STEPS.map((s, i) => {
                            const on = i === active;
                            return (
                                <li key={s.title}>
                                    <button
                                        onClick={() => pick(i)}
                                        aria-pressed={on}
                                        aria-controls="how-it-works-terminal"
                                        className={`group flex w-full cursor-pointer gap-5 rounded-lg border-l-2 px-5 py-4 text-left transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff66] ${on
                                            ? "border-[#00ff66] bg-[#00ff66]/[0.06]"
                                            : "border-white/10 hover:border-[#00ff66]/40 hover:bg-white/[0.03]"
                                            }`}
                                    >
                                        <span className={`pt-0.5 text-sm ${on ? "text-[#00ff66]" : "text-white/30"}`}>{i + 1}</span>
                                        <span>
                                            <span className={`block text-base ${on ? "text-white" : "text-white/60"}`}>{s.title}</span>
                                            <span
                                                className={`mt-1 block text-xs leading-6 transition-colors ${on ? "text-white/55" : "text-white/30"}`}
                                            >
                                                {s.body}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    {/* Terminal */}
                    <div id="how-it-works-terminal" aria-live="off">
                        <Terminal key={active} step={STEPS[active]} />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;