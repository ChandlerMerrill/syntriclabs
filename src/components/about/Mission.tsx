"use client";

import AnimateIn from "@/components/ui/AnimateIn";

export default function Mission() {
  return (
    <AnimateIn>
      <section className="mb-24">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="h-5 w-1.5 rounded-full bg-primary" />
            <h2 className="text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
              Our Mission
            </h2>
          </div>

          {/* Body */}
          <div className="mt-6 space-y-5 text-[17px] leading-relaxed text-gray-700 sm:text-lg">
            <p>
              Syntric exists to help businesses modernize how they operate. We
              collaborate directly with teams to design and implement robust
              workflows, automation systems, and practical tooling that bring
              structure and efficiency to everyday operations — often integrated
              with AI, but never driven by hype.
            </p>

            <p>
              Our focus is on building systems that are reliable, maintainable,
              and aligned with how your company actually works. We don’t just
              recommend tools — we build alongside you and ensure your team
              understands, adopts, and confidently uses what we create together.
            </p>
          </div>
        </div>

        {/* Subtle divider */}
        <div className="mt-10 h-px w-full max-w-3xl bg-gray-200/70" />
      </section>
    </AnimateIn>
  );
}
