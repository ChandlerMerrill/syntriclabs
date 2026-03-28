"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import GradientDivider from "@/components/ui/GradientDivider";
import FloatingIsland from "@/components/ui/FloatingIsland";
import { staggerContainer, fadeUp } from "@/lib/animations";

export default function ServicesCTA() {
  return (
    <section className="relative bg-grid py-24 sm:py-32">
      <GradientDivider className="mb-24 sm:mb-32" />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-1/2 left-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/[0.04] blur-[120px]"
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <FloatingIsland>
          <motion.div
            className="mx-auto max-w-2xl text-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Not sure which you need?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-lg leading-relaxed text-text-secondary"
            >
              That&apos;s what the discovery call is for. We&apos;ll talk through
              your operations, figure out where the real friction is, and tell
              you honestly what would help — whether that&apos;s a build, a
              workshop, or sometimes just a better spreadsheet.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <Button href="https://calendly.com/chandlermerrill-r/30min" external size="lg">
                Book a Discovery Call
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </FloatingIsland>
      </div>
    </section>
  );
}
