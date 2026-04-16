"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GradientDivider from "@/components/ui/GradientDivider";
import FloatingIsland from "@/components/ui/FloatingIsland";
import { staggerContainer, fadeUp } from "@/lib/animations";

export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-bg-secondary/50 py-24 sm:py-32">
      <GradientDivider className="mb-24 sm:mb-32" />

      {/* Ambient breathing glow */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-1/3 left-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/[0.08] blur-[120px]"
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
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
              Ready to stop fighting your own systems?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-lg leading-relaxed text-text-secondary"
            >
              Whether you need custom software or want your team trained on
              modern tools, it starts with a conversation. No pitch deck. No
              pressure. Just a real discussion about what&apos;s slowing your
              business down.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <Button render={<a href="https://calendly.com/chandler-syntriclabs/30min" target="_blank" rel="noopener noreferrer" />} size="lg">
                Book a Free Discovery Call
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </FloatingIsland>
      </div>
    </section>
  );
}
