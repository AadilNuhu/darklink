import { LockKeyhole, UserRoundX, Clock3 } from "lucide-react";

const Cards = [
  {
    icon: LockKeyhole,
    text: "Only you. Only them.",
    description:
      "End-to-end encryption by design. Your words belong to the people in the room. Nobody else.",
    type: "ZERO-KNOWLEDGE",
  },
  {
    icon: UserRoundX,
    text: "No accounts. No footprints.",
    description:
      "No sign-ups. No accounts. No saved history. No looking back.",
    type: "EPHEMERAL",
  },
  {
    icon: Clock3,
    text: "Less permanence. More freedom.",
    description:
      "Conversations that disappear when you're done. No lingering reminders.",
    type: "INSTANT DESTRUCTION",
  },
];

const PrincipleSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#050505] px-6 py-24 text-white sm:px-10 lg:px-16">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#00ff66]/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <div className="mb-5 flex items-center gap-3 font-mono text-xs tracking-[0.25em] text-[#00ff66]">
            <span className="h-px w-8 bg-[#00ff66]" />
            <span>// BUILT TO DISAPPEAR</span>
          </div>

          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-5xl">
            Less permanence.
            <br />
            <span className="text-zinc-500">More freedom.</span>
          </h2>

          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400">
            Privacy shouldn't be an afterthought. Every conversation is
            designed to exist only for as long as you need it.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {Cards.map((card, index) => {
            const Icon = card.icon;

            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-[#00ff66]/40 hover:bg-[#00ff66]/[0.04] hover:shadow-[0_0_40px_rgba(34,211,238,0.08)]"
              >
                {/* Number */}
                <div className="absolute right-6 top-6 font-mono text-xs text-[#00ff66] transition-colors duration-300 group-hover:text-cyan-400/50">
                  0{index + 1}
                </div>

                {/* Icon */}
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl border border-[#00ff66]/20 bg-[#00ff66]/5 text-[#00ff66] transition-all duration-300 group-hover:border-[#00ff66]/50 group-hover:bg-[#00ff66]/10 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                  <Icon
                    size={21}
                    strokeWidth={1.7}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                {/* Title */}
                <h3 className="mb-3 text-xl font-medium tracking-tight text-white">
                  {card.text}
                </h3>

                {/* Description */}
                <p className="min-h-[80px] text-sm leading-6 text-zinc-500 transition-colors duration-300 group-hover:text-zinc-400">
                  {card.description}
                </p>

                {/* Label */}
                <div className="mt-8 flex items-center gap-2 border-t border-white/5 pt-5 font-mono text-[10px] tracking-[0.2em] text-[#00ff66] transition-colors duration-300 group-hover:text-[#00ff66]">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 transition-all duration-300 group-hover:bg-[#00ff66] group-hover:shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  {card.type}
                </div>

                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 h-px w-0 bg-[#00ff66] shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-500 group-hover:w-full" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PrincipleSection;