"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerSlow, fadeUp, clipReveal } from "@/lib/animations";

export default function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/4 h-[400px] w-[600px] -translate-y-1/2 rounded-full bg-primary/[0.05] blur-[120px]" />
      </div>
      <img
        src="/svg/Curve Line.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full svg-breathe opacity-70"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-16 sm:pt-40 sm:pb-20">
        <motion.div
          className="max-w-3xl"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            variants={clipReveal}
            className="font-[family-name:var(--font-rajdhani)] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            One builder. Full platforms.{" "}
            <span className="gradient-text">No fluff.</span>
          </motion.h1>

          <motion.div
            variants={staggerSlow}
            initial="hidden"
            animate="show"
            className="mt-8 max-w-2xl space-y-5 text-lg leading-relaxed text-text-secondary"
          >
            <motion.p variants={fadeUp}>
              Syntric Labs started because too many small businesses were getting
              priced out of software that actually fits. The options were always
              the same: spend $30k+ at a traditional dev shop, or cram your
              workflows into generic SaaS tools that weren&apos;t designed for
              how you operate.
            </motion.p>
            <motion.p variants={fadeUp}>
              I&apos;m Chandler Merrill, and I build the third option. Custom
              software — scoped to your business, built fast, and priced fairly.
              Not a team of 12 billing by the hour. Just one person who
              understands both the technology and the operational problems
              it&apos;s supposed to solve.
            </motion.p>
            <motion.p variants={fadeUp}>
              I started Syntric because I kept seeing the same pattern: business
              owners who were sharp, growing, and running into walls that better
              software could tear down. They didn&apos;t need an enterprise
              platform. They didn&apos;t need a consultant to tell them what they
              already knew. They needed someone who could listen, understand the
              problem, and build the fix.
            </motion.p>
            <motion.p variants={fadeUp}>
              That&apos;s what I do. I&apos;ve shipped full multi-tenant
              platforms in weeks. I&apos;ve replaced $30k agency quotes with
              better systems at a fraction of the cost. And I stick around after
              launch — because software that works in staging doesn&apos;t
              always work in production, and I don&apos;t consider the job done
              until it does.
            </motion.p>
          </motion.div>
        </motion.div>
      </div>

      <div className="gradient-line" />
    </section>
  );
}
