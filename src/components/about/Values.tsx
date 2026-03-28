"use client";

import { motion } from "framer-motion";
import { Hammer, Search, Zap, Shield } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import TiltCard from "@/components/ui/TiltCard";
import { staggerContainer, fadeUp, popIn } from "@/lib/animations";

const values = [
  {
    icon: Hammer,
    title: "Build over buzzwords",
    description:
      "We don't sell a vision. We build working software. If it can't ship, it doesn't matter how good the slide deck looks.",
  },
  {
    icon: Search,
    title: "Understand first, build second",
    description:
      "Every project starts with learning your business. We don't assume we know what you need — we ask, we listen, and then we scope. The best systems are designed from the inside out.",
  },
  {
    icon: Zap,
    title: "Speed without shortcuts",
    description:
      "Fast delivery doesn't mean cutting corners. It means focused work, clear scope, and no wasted cycles. Two weeks to a full platform isn't rushed — it's efficient.",
  },
  {
    icon: Shield,
    title: "Stay until it works",
    description:
      "We don't hand off a codebase and disappear. We stick around through launch, through the first real users, through the edge cases nobody planned for. The job isn't done until your team is running the system confidently.",
  },
];

export default function Values() {
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
            <SectionLabel label="How We Work" />
            <h2 className="mt-3 font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
              Principles, not pitches
            </h2>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-6 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {values.map((value, i) => (
            <motion.div key={value.title} variants={popIn}>
              <TiltCard>
              <div
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl gradient-border-hover bg-bg-secondary p-8 transition-all duration-300 hover:bg-bg-secondary/90 hover:shadow-lg hover:shadow-accent-purple/5"
              >
                {/* Large background number */}
                <span className="pointer-events-none absolute top-4 right-6 font-[family-name:var(--font-rajdhani)] text-[6rem] font-bold leading-none text-text-primary/[0.03]">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Accent line */}
                <div className="gradient-line mb-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-purple/20 bg-accent-purple/[0.08]">
                  <value.icon className="h-5 w-5 text-accent-purple" />
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-rajdhani)] text-xl font-bold">
                  {value.title}
                </h3>
                <p className="mt-3 leading-relaxed text-text-secondary">
                  {value.description}
                </p>
              </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
