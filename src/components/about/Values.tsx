"use client";

import { Target, BarChart3, Heart, Zap } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";

const values = [
  {
    icon: Target,
    title: "Execution Over Hype",
    description:
      "We ship working systems, not slide decks. Every project has a clear scope, timeline, and measurable outcome.",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Real ROI",
    description:
      "We measure success in time saved, costs reduced, and revenue gained — not vanity metrics.",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    icon: Heart,
    title: "Human-Centered AI",
    description:
      "AI should empower your team, not replace them. We build tools that let people focus on what they do best.",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: Zap,
    title: "Speed to Value",
    description:
      "We go from idea to production in weeks, not months. Fast iteration, fast feedback, fast results.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

export default function Values() {
  return (
    <section className="mb-20">
      <AnimateIn>
        <h2 className="mb-10 text-3xl font-extrabold tracking-tight text-near-black sm:text-4xl">
          What We Stand For
        </h2>
      </AnimateIn>

      <div className="grid gap-6 sm:grid-cols-2">
        {values.map((value, i) => (
          <AnimateIn key={value.title} delay={i * 0.1}>
            <div className="flex gap-4 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${value.iconBg}`}
              >
                <value.icon className={`h-6 w-6 ${value.iconColor}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-near-black">
                  {value.title}
                </h3>
                <p className="mt-1 leading-relaxed text-gray-500">
                  {value.description}
                </p>
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>
    </section>
  );
}
