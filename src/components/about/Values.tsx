"use client";

import { Target, BarChart3, Heart, Zap } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";

const values = [
  {
    icon: Target,
    title: "Build > Buzzwords",
    description:
      "We partner with your team to ship real systems — clear scope, tight feedback loops, and outcomes you can point to.",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Measurable Impact",
    description:
      "Success looks like hours saved, fewer handoffs, and smoother operations — measured in the work that actually changes.",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: Heart,
    title: "Team-First Automation",
    description:
      "Automation should make your people better at their jobs. We build tools your team can trust, understand, and own.",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: Zap,
    title: "Fast, Durable Delivery",
    description:
      "We move quickly without cutting corners — shipping in weeks, iterating in production, and building for maintainability.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

export default function Values() {
  return (
    <section className="mb-24">
      <AnimateIn>
        <div className="mb-10 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="h-5 w-1.5 rounded-full bg-primary" />
            <h2 className="text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
              What We Stand For
            </h2>
          </div>
          <p className="mt-4 text-[17px] leading-relaxed text-gray-700 sm:text-lg">
            We modernize operations by building alongside your team — combining
            solid systems design with automation and AI where it makes sense.
          </p>
        </div>
      </AnimateIn>

      <div className="grid gap-6 sm:grid-cols-2">
        {values.map((value, i) => (
          <AnimateIn key={value.title} delay={i * 0.1}>
            <div className="group flex gap-4 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300/70 hover:shadow-md">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${value.iconBg}`}
              >
                <value.icon className={`h-6 w-6 ${value.iconColor}`} />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-near-black">
                  {value.title}
                </h3>
                <p className="mt-1 leading-relaxed text-gray-600">
                  {value.description}
                </p>
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>

      <div className="mt-10 h-px w-full bg-gray-200/70" />
    </section>
  );
}
