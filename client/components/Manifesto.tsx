import { X, ArrowUpRight } from "lucide-react";

const Manifesto = () => {
    return (
        <section className="relative overflow-hidden border-y border-white/10 bg-[#050505] px-6 py-4 text-white sm:px-10 lg:px-16">
                {/* Manifesto */}
                <div className="block md:flex justify-between items-center">
                    <div className="text-xl font-medium leading-tight tracking-tight text-zinc-500 sm:text-4xl lg:text-xl">
                        The internet remembers everything.
                        <br />
                        <span className="text-white">
                            We think it's okay to forget.
                        </span>
                    </div>

                    {/* CTA */}
                    <div
                        className="group mt-4 md:mt-10 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-300 hover:border-cyan-400/30 hover:bg-cyan-400/[0.06] hover:text-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.08)]"
                    >
                        Start a conversation

                        <ArrowUpRight
                            size={16}
                            strokeWidth={1.8}
                            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                    </div>
                </div>
        </section>
    );
};

export default Manifesto;