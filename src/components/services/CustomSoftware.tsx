"use client";

import { motion } from "framer-motion";
import {
  Users,
  ShoppingCart,
  LayoutDashboard,
  Workflow,
  MessageSquare,
  Phone,
  Search,
  PenTool,
  Hammer,
  Rocket,
} from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import TiltCard from "@/components/ui/TiltCard";
import { staggerContainer, staggerFast, fadeUp, popIn } from "@/lib/animations";

const capabilities = [
  { icon: Users, label: "Client and admin portals" },
  { icon: ShoppingCart, label: "E-commerce platforms with inventory management" },
  { icon: LayoutDashboard, label: "Internal dashboards and reporting tools" },
  { icon: Workflow, label: "Automated workflows (orders, notifications, data sync)" },
  { icon: MessageSquare, label: "AI chat agents for support and lead capture" },
  { icon: Phone, label: "AI voice agents for booking and call handling" },
];

const steps = [
  {
    icon: Search,
    title: "Discovery",
    description:
      "We learn your business. What's working, what's not, where you're losing time.",
  },
  {
    icon: PenTool,
    title: "Scope & Design",
    description:
      "We map out the system together. You see what you're getting before we build it.",
  },
  {
    icon: Hammer,
    title: "Build",
    description:
      "Fast, focused development. You see progress weekly, not monthly.",
  },
  {
    icon: Rocket,
    title: "Launch & Support",
    description:
      "We don't hand off and vanish. We stick around until it's running in production and your team knows how to use it.",
  },
];

export default function CustomSoftware() {
  return (
    <section className="bg-grid py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel label="Build" />
            <h2 className="mt-3 font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
              Custom platforms, not cookie-cutter templates
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-text-secondary">
              Every business we work with has a different set of problems. We
              don&apos;t have a product to sell you — we build what you need. That
              means scoping your workflows, understanding where the bottlenecks
              are, and designing a system that fits.
            </p>
          </motion.div>
        </motion.div>

        {/* Capabilities grid */}
        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerFast}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {capabilities.map((cap) => (
            <motion.div key={cap.label} variants={popIn}>
              <TiltCard>
                <div
                  className="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary p-4 transition-all duration-200 hover:border-border-hover hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-tertiary">
                    <cap.icon className="h-5 w-5 text-primary-lighter" />
                  </div>
                  <span className="text-sm text-text-primary">{cap.label}</span>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Process */}
        <motion.div
          className="mt-20"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.h3 variants={fadeUp} className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold">
            Our process
          </motion.h3>
          <motion.div
            className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            variants={staggerFast}
          >
            {steps.map((step, i) => (
              <motion.div key={step.title} variants={fadeUp} className="relative flex flex-col">
                {/* Animated connector line */}
                {i < steps.length - 1 && (
                  <motion.div
                    className="absolute top-5 left-[calc(100%+0.5rem)] hidden h-px w-[calc(100%-1rem)] bg-gradient-to-r from-accent-purple/30 to-accent-cyan/30 lg:block"
                    initial={{ scaleX: 0, originX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease: [0.16, 1, 0.3, 1] as const }}
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-purple/20 bg-accent-purple/[0.08]">
                    <step.icon className="h-5 w-5 text-accent-purple" />
                  </div>
                  <span className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-widest text-text-secondary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h4 className="mt-4 font-[family-name:var(--font-rajdhani)] text-lg font-bold">
                  {step.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
