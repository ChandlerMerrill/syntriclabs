"use client";

import { Search, Wrench, TrendingUp } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimateIn from "@/components/ui/AnimateIn";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Discover",
    description:
      "We map your workflows and identify high-impact automation opportunities.",
  },
  {
    number: "02",
    icon: Wrench,
    title: "Build",
    description:
      "We design and deploy AI agents tailored to your operations.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Scale",
    description:
      "We train your team and optimize systems for measurable ROI.",
  },
];

export default function Process() {
  return (
    <section className="bg-white py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <SectionHeader
          title="How It Works"
          subtitle="A proven process to go from idea to production-ready AI in weeks, not months."
        />

        <div className="relative grid gap-16 lg:grid-cols-3 lg:gap-8">
          {/* Connector line (desktop only) */}
          <div className="pointer-events-none absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] hidden lg:block">
            <div className="h-px w-full bg-gradient-to-r from-gray-200 via-primary/20 to-gray-200" />
          </div>

          {steps.map((step, i) => (
            <AnimateIn key={step.title} delay={i * 0.15}>
              <div className="relative text-center">
                {/* Step circle */}
                <div className="relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-bg to-white border border-primary/10 shadow-sm">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="mb-3 inline-block rounded-full bg-primary-bg px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-primary">
                  Step {step.number}
                </span>
                <h3 className="text-xl font-bold text-near-black">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-gray-500">
                  {step.description}
                </p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
