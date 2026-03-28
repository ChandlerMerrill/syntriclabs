"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { staggerContainer, fadeUp, clipReveal } from "@/lib/animations";

export default function ContactHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 right-1/4 h-[400px] w-[500px] -translate-y-1/2 rounded-full bg-accent-cyan/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-32 pb-16 sm:pt-40 sm:pb-20">
        <motion.div
          className="max-w-2xl"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            variants={clipReveal}
            className="font-[family-name:var(--font-rajdhani)] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Tell us what&apos;s{" "}
            <span className="gradient-text">slowing you down.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary"
          >
            Whether it&apos;s a system you&apos;ve outgrown, a process that eats
            up your week, or a team that needs better tools — we want to hear
            about it. Fill out the form below and we&apos;ll get back to you
            within 24 hours.
          </motion.p>

          <motion.a
            variants={fadeUp}
            href="https://calendly.com/chandlermerrill-r/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary-lighter transition-colors hover:text-primary"
          >
            Or book a call directly
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.a>
        </motion.div>
      </div>

      <div className="gradient-line" />
    </section>
  );
}
