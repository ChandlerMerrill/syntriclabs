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
    iconHoverBg: "group-hover:bg-blue-100",
    iconColor: "text-blue-600",
    accentColor: "bg-blue-500",
    hoverBorder: "hover:border-blue-200",
    hoverShadow: "hover:shadow-blue-100/50",
  },
  {
    icon: BarChart3,
    title: "Measurable Impact",
    description:
      "Success looks like hours saved, fewer handoffs, and smoother operations — measured in the work that actually changes.",
    iconBg: "bg-emerald-50",
    iconHoverBg: "group-hover:bg-emerald-100",
    iconColor: "text-emerald-600",
    accentColor: "bg-emerald-500",
    hoverBorder: "hover:border-emerald-200",
    hoverShadow: "hover:shadow-emerald-100/50",
  },
  {
    icon: Heart,
    title: "Team-First Automation",
    description:
      "Automation should make your people better at their jobs. We build tools your team can trust, understand, and own.",
    iconBg: "bg-rose-50",
    iconHoverBg: "group-hover:bg-rose-100",
    iconColor: "text-rose-600",
    accentColor: "bg-rose-500",
    hoverBorder: "hover:border-rose-200",
    hoverShadow: "hover:shadow-rose-100/50",
  },
  {
    icon: Zap,
    title: "Fast, Durable Delivery",
    description:
      "We move quickly without cutting corners — shipping in weeks, iterating in production, and building for maintainability.",
    iconBg: "bg-amber-50",
    iconHoverBg: "group-hover:bg-amber-100",
    iconColor: "text-amber-600",
    accentColor: "bg-amber-500",
    hoverBorder: "hover:border-amber-200",
    hoverShadow: "hover:shadow-amber-100/50",
  },
];

export default function Values() {
  return (
    <div>
      <AnimateIn>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
            What We Stand For
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-gray-700 sm:text-lg">
            We modernize operations by building alongside your team — combining
            solid systems design with automation and AI where it makes sense.
          </p>
        </div>
      </AnimateIn>

      <div className="grid gap-6 sm:grid-cols-2">
        {values.map((value, i) => (
          <AnimateIn key={value.title} delay={i * 0.1}>
            <div
              className={`group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${value.hoverBorder} ${value.hoverShadow}`}
            >
              {/* Top accent line */}
              <div
                className={`absolute inset-x-0 top-0 h-0.5 ${value.accentColor} opacity-30 transition-opacity duration-300 group-hover:opacity-100`}
              />

              {/* Icon */}
              <div
                className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 ${value.iconBg} ${value.iconHoverBg}`}
              >
                <value.icon className={`h-7 w-7 ${value.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-near-black">
                {value.title}
              </h3>

              {/* Description */}
              <p className="mt-3 leading-relaxed text-gray-600">
                {value.description}
              </p>
            </div>
          </AnimateIn>
        ))}
      </div>
    </div>
  );
}
