"use client";

import { MessageSquare, Phone, Lightbulb } from "lucide-react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimateIn from "@/components/ui/AnimateIn";
import Link from "next/link";

const services = [
  {
    icon: MessageSquare,
    title: "AI Chat Agents",
    description:
      "Automate customer interactions, capture leads, and create tickets in real time.",
    href: "/services#chat-demo",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Phone,
    title: "AI Voice Agents",
    description:
      "Handle inbound calls and callbacks with human-like AI that logs every interaction.",
    href: "/services#voice-demo",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: Lightbulb,
    title: "Workshops & Consulting",
    description:
      "Hands-on sessions to identify automation opportunities and build your AI roadmap.",
    href: "/contact",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

export default function ServicesOverview() {
  return (
    <section className="bg-off-white py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <SectionHeader
          title="What We Build"
          subtitle="From intelligent chat agents to voice-powered workflows, we deliver AI systems that work from day one."
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <AnimateIn key={service.title} delay={i * 0.1}>
              <Link href={service.href} className="group block h-full">
                <Card className="flex h-full flex-col">
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${service.iconBg}`}
                  >
                    <service.icon className={`h-6 w-6 ${service.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-near-black">
                    {service.title}
                  </h3>
                  <p className="mt-2 flex-1 leading-relaxed text-gray-500">
                    {service.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                    Learn more
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </Card>
              </Link>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
