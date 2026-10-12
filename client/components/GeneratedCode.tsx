"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck, Users, X } from "lucide-react";

const codeUsers = "B67H9IS0";
const codeAdmin = "Q90F3VX9";

type GeneratedCodeProps = {
  onClose: () => void;
};

const GeneratedCode = ({ onClose }: GeneratedCodeProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);

      setTimeout(() => {
        setCopiedCode((current) =>
          current === code ? null : current
        );
      }, 2000);
    } catch {
      setCopiedCode(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
      bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generated-code-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl
        border border-white/10 bg-[#0b0b0b] text-white
        shadow-[0_0_50px_rgba(0,255,102,0.08)]
        animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b
        border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div>
              <h2
                id="generated-code-title"
                className="text-lg font-semibold tracking-tight"
              >
                Generated Codes
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Share access codes with your users
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-2 text-gray-400 transition
            hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6">
          {/* User Code */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Users size={16} className="text-[#00ff66]" />
              <label className="text-sm font-medium text-gray-200">
                Code for all users
              </label>
            </div>

            <div className="flex items-center justify-between gap-3
            rounded-xl border border-white/10 bg-white/[0.03] p-3
            transition hover:border-[#00ff66]/40">
              <span className="pl-1 font-mono text-lg font-semibold
              tracking-[0.15em] text-white">
                {codeUsers}
              </span>

              <button
                type="button"
                onClick={() => handleCopy(codeUsers)}
                className="flex shrink-0 items-center gap-2 rounded-lg
                bg-[#00ff66] px-3 py-2 text-sm font-semibold
                text-black transition hover:bg-[#00e65c]
                active:scale-95"
              >
                {copiedCode === codeUsers ? (
                  <>
                    <Check size={15} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              For regular users accessing the platform.
            </p>
          </div>

          {/* Admin Code */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#00ff66]" />
              <label className="text-sm font-medium text-gray-200">
                Admin access code
              </label>
            </div>

            <div className="flex items-center justify-between gap-3
            rounded-xl border border-white/10 bg-white/[0.03] p-3
            transition hover:border-[#00ff66]/40">
              <span className="pl-1 font-mono text-lg font-semibold
              tracking-[0.15em] text-white">
                {codeAdmin}
              </span>

              <button
                type="button"
                onClick={() => handleCopy(codeAdmin)}
                className="flex shrink-0 items-center gap-2 rounded-lg
                bg-[#00ff66] px-3 py-2 text-sm font-semibold
                text-black transition hover:bg-[#00e65c]
                active:scale-95"
              >
                {copiedCode === codeAdmin ? (
                  <>
                    <Check size={15} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Restricted code for administrator access.
            </p>
          </div>

          {/* Footer Notice */}
          <div className="flex items-start gap-2 rounded-xl border
          border-[#00ff66]/10 bg-[#00ff66]/[0.04] p-3">
            <ShieldCheck
              size={17}
              className="mt-0.5 shrink-0 text-[#00ff66]"
            />
            <p className="text-xs leading-relaxed text-gray-400">
              Keep your admin code private.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-white/10
            bg-white/[0.04] py-3 text-sm font-medium text-gray-300
            transition hover:border-white/20 hover:bg-white/[0.08]
            hover:text-white cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedCode;