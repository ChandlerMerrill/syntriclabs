"use client";

import { MessageSquare, Phone, Lightbulb, ArrowUpRight, UserPlus, FileText, CalendarCheck, PhoneIncoming, PhoneOutgoing, BarChart3, BookOpen, Route, Sparkles } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimateIn from "@/components/ui/AnimateIn";
import Link from "next/link";

const services = [
  {
    icon: MessageSquare,
    title: "AI Chat Agents",
    description:
      "Agents that handle customer inquiries 24/7 — capturing leads, resolving tickets, and updating your CRM in real time.",
    href: "/services",
    color: "blue" as const,
    features: [
      { icon: UserPlus, label: "Lead capture" },
      { icon: FileText, label: "Ticket creation" },
      { icon: CalendarCheck, label: "Appointment booking" },
    ],
  },
  {
    icon: Phone,
    title: "AI Voice Agents",
    description:
      "Human-like phone agents that qualify leads, book meetings, and handle follow-ups — inbound and outbound.",
    href: "/services#voice-demo",
    color: "violet" as const,
    features: [
      { icon: PhoneIncoming, label: "Inbound calls" },
      { icon: PhoneOutgoing, label: "Outbound campaigns" },
      { icon: BarChart3, label: "Call analytics" },
    ],
  },
  {
    icon: Lightbulb,
    title: "Workshops & Consulting",
    description:
      "Hands-on sessions to identify your highest-ROI automation opportunities and build a concrete roadmap.",
    href: "/services#workshops",
    color: "amber" as const,
    features: [
      { icon: BookOpen, label: "Team training" },
      { icon: Route, label: "Implementation roadmap" },
      { icon: Sparkles, label: "AI strategy" },
    ],
  },
];

const colorMap = {
  blue: {
    iconBg: "bg-blue-50 group-hover:bg-blue-100",
    iconColor: "text-blue-600",
    border: "group-hover:border-blue-200",
    glow: "group-hover:shadow-blue-100/50",
    accent: "bg-blue-500",
    featureBg: "bg-blue-50/60",
    featureText: "text-blue-600/80",
  },
  violet: {
    iconBg: "bg-violet-50 group-hover:bg-violet-100",
    iconColor: "text-violet-600",
    border: "group-hover:border-violet-200",
    glow: "group-hover:shadow-violet-100/50",
    accent: "bg-violet-500",
    featureBg: "bg-violet-50/60",
    featureText: "text-violet-600/80",
  },
  amber: {
    iconBg: "bg-amber-50 group-hover:bg-amber-100",
    iconColor: "text-amber-600",
    border: "group-hover:border-amber-200",
    glow: "group-hover:shadow-amber-100/50",
    accent: "bg-amber-500",
    featureBg: "bg-amber-50/60",
    featureText: "text-amber-600/80",
  },
};

export default function ServicesOverview() {
  return (
    <section className="relative bg-white py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.50]"
        style={{
          backgroundImage: "radial-gradient(circle, #9EA6B0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6">
        <SectionHeader
          label="Our Services"
          title="What We Build"
          subtitle="From intelligent chat agents to voice-powered workflows — AI systems that work from day one."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {services.map((service, i) => {
            const colors = colorMap[service.color];
            return (
              <AnimateIn key={service.title} delay={i * 0.1}>
                <Link href={service.href} className="group block h-full">
                  <div
                    className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${colors.border} ${colors.glow}`}
                  >
                    {/* Colored accent line at top */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-0.5 ${colors.accent} opacity-30 transition-opacity duration-300 group-hover:opacity-100`}
                    />

                    {/* Number + icon row */}
                    <div className="mb-6 flex items-center justify-between">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 ${colors.iconBg}`}
                      >
                        <service.icon className={`h-6 w-6 ${colors.iconColor}`} />
                      </div>
                      <span className="text-4xl font-extrabold text-gray-100 transition-colors duration-300 group-hover:text-gray-200">
                        0{i + 1}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-near-black">
                      {service.title}
                    </h3>
                    <p className="mt-3 flex-1 text-[15px] leading-relaxed text-gray-500">
                      {service.description}
                    </p>

                    {/* Feature pills */}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {service.features.map((feat) => (
                        <span
                          key={feat.label}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.featureBg} ${colors.featureText}`}
                        >
                          <feat.icon className="h-3 w-3" />
                          {feat.label}
                        </span>
                      ))}
                    </div>

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
