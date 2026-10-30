import { LockKeyhole, UserRoundX, Clock3 } from "lucide-react";
import { JetBrains_Mono } from "next/font/google";

const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap" });

const Cards = [
  {
    icon: LockKeyhole,
    text: "Only you. Only them.",
    description:
      "End-to-end encryption by design. Your words belong to the people in the room. Nobody else.",
    type: "zero-knowledge",
  },
  {
    icon: UserRoundX,
    text: "No accounts. No footprints.",
    description: "No sign-ups. No accounts. No saved history. No looking back.",
    type: "ephemeral",
  },
  {
    icon: Clock3,
    text: "Less permanence. More freedom.",
    description:
      "Conversations that disappear when you're done. No lingering reminders.",
    type: "instant-destruction",
  },
];

const PrincipleSection = () => {
  return (
    <section
      className={`${mono.className} relative overflow-hidden border-t border-white/[0.06] bg-[#05070A] px-5 py-24 text-white sm:px-8 lg:px-12`}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#00ff66]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl lg:text-5xl">
            Built to disappear.
            <br />
            <span className="text-[#00ff66]/40">Not to be kept.</span>
          </h2>

          <p className="mt-6 max-w-md text-sm leading-7 text-white/50">
            Privacy shouldn&apos;t be an afterthought. Every conversation is
            designed to exist only for as long as you need it.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {Cards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.text}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:border-[#00ff66]/40 hover:shadow-[0_0_50px_-20px_rgba(0,255,102,0.45)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {/* Title bar */}
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3 text-xs">
                  <span className="text-[#00ff66]/80">{"// "}{card.type}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-white/15 transition duration-300 group-hover:bg-[#00ff66] group-hover:shadow-[0_0_8px_rgba(0,255,102,0.8)]" />
                </div>

                <div className="p-7">
                  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg border border-[#00ff66]/20 bg-[#00ff66]/5 text-[#00ff66] transition duration-300 group-hover:border-[#00ff66]/50 group-hover:bg-[#00ff66]/10 group-hover:shadow-[0_0_20px_rgba(0,255,102,0.2)]">
                    <Icon
                      size={21}
                      strokeWidth={1.7}
                      className="transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </div>

                  <h3 className="mb-3 text-lg font-medium leading-snug tracking-tight text-white">
                    {card.text}
                  </h3>

                  <p className="min-h-[88px] text-sm leading-6 text-white/50 transition-colors duration-300 group-hover:text-white/65">
                    {card.description}
                  </p>
                </div>

                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 h-px w-0 bg-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.8)] transition-all duration-500 group-hover:w-full motion-reduce:transition-none" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PrincipleSection;