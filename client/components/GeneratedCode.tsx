"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ShieldCheck, Users, X } from "lucide-react";

const GeneratedCode = ({ onClose, roomCode, adminCode, hostUsername }: { onClose: () => void; roomCode: string; adminCode: string; hostUsername?: string }) => {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      setCopied(null);
    }
  };

  const codes = [
    { label: "Code for all users", hint: "Gives regular access to the room.", code: roomCode, Icon: Users, color: "#00ff66" },
    { label: "Admin access code", hint: "Gives full control. Keep it private.", code: adminCode, Icon: ShieldCheck, color: "#fbbf24" },
  ];

  const adminLink = `http://localhost:3000/room/${adminCode}${hostUsername ? `?u=${encodeURIComponent(hostUsername)}` : ""}`;
  const [copiedLink, setCopiedLink] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(adminLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md
        bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,255,102,0.14),transparent_60%),rgba(2,4,3,0.85)]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes gc-in { from { opacity: 0; transform: translateY(14px) scale(.97) } }
        @media (prefers-reduced-motion: reduce) { .gc-in { animation: none !important } }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gc-title"
        className="gc-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#080b09] p-5 text-white
          shadow-[0_0_90px_-25px_rgba(0,255,102,0.45)]"
        style={{ animation: "gc-in .3s cubic-bezier(.2,.8,.2,1) both" }}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="gc-title" className="text-lg font-semibold tracking-tight">Your room is live</h2>
            <p className="text-sm text-white/50">Share a code to let people in.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-red-600 cursor-pointer hover:text-white
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff66]/60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {codes.map(({ label, hint, code, Icon, color }) => (
            <div key={code}>
              <div className="mb-1.5 flex items-center gap-2 text-sm text-gray-200">
                <Icon size={15} style={{ color }} />
                {label}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <span
                  className="flex-1 pl-2 font-mono text-lg font-semibold tracking-[0.25em]"
                  style={{ color }}
                  aria-label={code.split("").join(" ")}
                >
                  {code}
                </span>
                <button
                  type="button"
                  onClick={() => copy(code)}
                  style={{ backgroundColor: color }}
                  className="flex w-24 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-black
                    transition hover:brightness-110 active:scale-95 cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {copied === code ? <Check size={14} /> : <Copy size={14} />}
                  {copied === code ? "Copied" : "Copy"}
                </button>
              </div>

              <p className="mt-1.5 text-xs text-white/45">{hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <p className="mb-1.5 text-xs text-white/50">Admin login link</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 pl-2 font-mono text-xs text-white/70 break-all">{adminLink}</span>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-20 items-center justify-center gap-1.5 rounded-lg bg-[#fbbf24] py-2 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95"
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              {copiedLink ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedCode;