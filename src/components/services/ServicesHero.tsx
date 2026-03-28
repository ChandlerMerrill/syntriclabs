"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, clipReveal } from "@/lib/animations";

export default function ServicesHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/3 left-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/[0.05] blur-[120px]" />
      </div>
      <img
        src="/svg/Curve Line.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full svg-breathe opacity-70"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-16 sm:pt-40 sm:pb-20">
        <motion.div
          className="mx-auto max-w-3xl"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            variants={clipReveal}
            className="font-[family-name:var(--font-rajdhani)] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Software and training built around your business —{" "}
            <span className="gradient-text">not the other way around.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary"
          >
            We offer two things: custom-built software that solves real
            operational problems, and workshops that teach your team to solve
            them on their own. Both start with understanding how your business
            actually works.
          </motion.p>
        </motion.div>
      </div>

      <div className="gradient-line relative z-10" />
    </section>
  );
}
