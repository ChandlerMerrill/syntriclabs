"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background: subtle dot grid + gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #94A3B8 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-primary/8 to-primary-lighter/12 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-primary-lighter/10 to-transparent blur-3xl" />
        {/* Fade to white at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-6 pb-28 pt-28 sm:pb-36 sm:pt-36 lg:pb-44 lg:pt-44">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-bg px-4 py-1.5 text-sm font-medium text-primary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            AI solutions for modern businesses
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-4xl font-extrabold leading-[1.1] tracking-tight text-near-black sm:text-5xl lg:text-6xl"
          >
            Win back your time.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-lighter bg-clip-text text-transparent">
              Scale with AI
            </span>{" "}
            that delivers ROI.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-500"
          >
            We build practical AI automation systems — agents, workflows, and
            integrations — that plug directly into your business and drive
            measurable results.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button href="/services" size="lg">
              See it in action
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Get in touch
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
