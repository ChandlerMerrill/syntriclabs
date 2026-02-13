"use client";

import { MessageSquare, Phone, Lightbulb, ArrowUpRight } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimateIn from "@/components/ui/AnimateIn";
import Link from "next/link";

const services = [
  {
    icon: MessageSquare,
    title: "AI Chat Agents",
    description:
      "Automate customer interactions, capture leads, and create tickets in real time.",
    href: "/services",
    color: "blue" as const,
  },
  {
    icon: Phone,
    title: "AI Voice Agents",
    description:
      "Handle inbound calls and callbacks with human-like AI that logs every interaction.",
    href: "/services#voice-demo",
    color: "violet" as const,
  },
  {
    icon: Lightbulb,
    title: "Workshops & Consulting",
    description:
      "Hands-on sessions to identify automation opportunities and build your AI roadmap.",
    href: "/services#workshops",
    color: "amber" as const,
  },
];

const colorMap = {
  blue: {
    iconBg: "bg-blue-50 group-hover:bg-blue-100",
    iconColor: "text-blue-600",
    border: "group-hover:border-blue-200",
    glow: "group-hover:shadow-blue-100/50",
    accent: "bg-blue-500",
  },
  violet: {
    iconBg: "bg-violet-50 group-hover:bg-violet-100",
    iconColor: "text-violet-600",
    border: "group-hover:border-violet-200",
    glow: "group-hover:shadow-violet-100/50",
    accent: "bg-violet-500",
  },
  amber: {
    iconBg: "bg-amber-50 group-hover:bg-amber-100",
    iconColor: "text-amber-600",
    border: "group-hover:border-amber-200",
    glow: "group-hover:shadow-amber-100/50",
    accent: "bg-amber-500",
  },
};

export default function ServicesOverview() {
  return (
    <section className="bg-white py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <SectionHeader
          title="What We Build"
          subtitle="From intelligent chat agents to voice-powered workflows, we deliver AI systems that work from day one."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {services.map((service, i) => {
            const colors = colorMap[service.color];
            return (
              <AnimateIn key={service.title} delay={i * 0.1}>
                <Link href={service.href} className="group block h-full">
                  <div
                    className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${colors.border} ${colors.glow}`}
                  >
                    {/* Colored accent line at top */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-px ${colors.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                    />

                    <div
                      className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 ${colors.iconBg}`}
                    >
                      <service.icon className={`h-6 w-6 ${colors.iconColor}`} />
                    </div>

                    <h3 className="text-xl font-bold text-near-black">
                      {service.title}
                    </h3>
                    <p className="mt-3 flex-1 leading-relaxed text-gray-500">
                      {service.description}
                    </p>

                    <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Learn more
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </AnimateIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
