"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import { staggerContainer, fadeUp, clipReveal } from "@/lib/animations";

export default function Hero() {
  return (
    <InteractiveHeroBackground>
      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-32">
        <motion.div
          className="mx-auto max-w-4xl"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary px-4 py-1.5 text-sm text-text-secondary backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent-cyan" />
              Now taking on new projects
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={clipReveal}
            className="text-center font-[family-name:var(--font-rajdhani)] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Your business has outgrown
            <br />
            <span className="gradient-text">your spreadsheets.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-text-secondary sm:text-xl"
          >
            We build custom software that replaces the duct tape — the Excel
            trackers, the manual follow-ups, the disconnected tools. Full
            platforms, delivered in weeks, at a fraction of what traditional dev
            shops charge.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button href="https://calendly.com/chandlermerrill-r/30min" external size="lg">
              Book a Discovery Call
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="#portfolio" variant="secondary" size="lg">
              See Our Work
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Wave Line SVG — decorative, fills entire hero */}
      <img
        src="/svg/Wave Line.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full svg-breathe opacity-60"
      />

      {/* Bottom gradient line */}
      <div className="gradient-line relative z-10" />
    </InteractiveHeroBackground>
  );
}
