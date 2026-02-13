"use client";

import AnimateIn from "@/components/ui/AnimateIn";

export default function Mission() {
  return (
    <AnimateIn>
      <div className="mx-auto max-w-4xl text-center">
        {/* Header */}
        <h2 className="text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
          Our Mission
        </h2>

        {/* Gradient accent underline */}
        <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-blue-400" />

        {/* Body */}
        <div className="mt-10 space-y-6 text-lg leading-relaxed text-gray-700 sm:text-xl sm:leading-relaxed">
          <p>
            Syntric exists to help businesses modernize how they operate. We
            collaborate directly with teams to design and implement robust
            workflows, automation systems, and practical tooling that bring
            structure and efficiency to everyday operations — often integrated
            with AI, but never driven by hype.
          </p>

          <p>
            Our focus is on building systems that are reliable, maintainable,
            and aligned with how your company actually works. We don&apos;t just
            recommend tools — we build alongside you and ensure your team
            understands, adopts, and confidently uses what we create together.
          </p>
        </div>
      </div>
    </AnimateIn>
  );
}
