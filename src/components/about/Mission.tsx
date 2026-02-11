"use client";

import AnimateIn from "@/components/ui/AnimateIn";

export default function Mission() {
  return (
    <AnimateIn>
      <section className="mb-20">
        <h2 className="text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
          Our Mission
        </h2>
        <div className="mt-6 max-w-3xl space-y-4 text-lg text-gray-700">
          <p>
            Syntric Labs exists to close the gap between AI hype and real
            business impact. We build practical automation systems — agents,
            workflows, and integrations — that plug directly into your
            operations and start delivering value from day one.
          </p>
          <p>
            We believe every business deserves access to AI that actually works,
            not just impressive demos. Our focus is on measurable ROI, not
            buzzwords.
          </p>
        </div>
      </section>
    </AnimateIn>
  );
}
