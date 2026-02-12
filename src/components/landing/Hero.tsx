"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#fafbff]">
      {/* Animated gradient mesh background */}
      <div className="pointer-events-none absolute inset-0">
        {/* Primary aurora blob */}
        <motion.div
          className="absolute -top-1/4 left-1/4 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-primary/15 via-primary-lighter/20 to-transparent blur-[100px]"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 15, 0],
            scale: [1, 1.05, 0.97, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Secondary aurora blob */}
        <motion.div
          className="absolute -bottom-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-violet-400/10 via-primary/10 to-transparent blur-[100px]"
          animate={{
            x: [0, -25, 20, 0],
            y: [0, 20, -15, 0],
            scale: [1, 0.97, 1.04, 1],
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Accent orb */}
        <motion.div
          className="absolute top-1/3 right-1/6 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-sky-300/10 to-transparent blur-[80px]"
          animate={{
            x: [0, 15, -10, 0],
            y: [0, -10, 20, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #94A3B830 1px, transparent 1px), linear-gradient(to bottom, #94A3B830 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-6 pb-24 pt-32 sm:pb-32 sm:pt-40 lg:pb-40 lg:pt-48">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-3 w-3 text-primary" />
            </span>
            AI solutions for modern businesses
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-4xl font-extrabold leading-[1.08] tracking-tight text-near-black sm:text-5xl md:text-6xl lg:text-[4.25rem]"
          >
            Win back your time.
            <br />
            <span className="bg-gradient-to-r from-primary via-primary-light to-violet-500 bg-clip-text text-transparent">
              Scale with AI
            </span>{" "}
            that
            <br className="hidden sm:block" />
            {" "}delivers ROI.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl sm:leading-relaxed"
          >
            We build practical AI automation systems — agents, workflows, and
            integrations — that plug directly into your business and drive
            measurable results.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button href="/services" size="lg">
              See it in action
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Book a consultation
            </Button>
          </motion.div>

          {/* Social proof metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: "easeOut" }}
            className="mx-auto mt-16 flex max-w-lg flex-col items-center justify-center gap-8 sm:mt-20 sm:flex-row sm:gap-12"
          >
            {[
              { icon: BarChart3, value: "10x", label: "Faster Response" },
              { icon: Zap, value: "85%", label: "Tasks Automated" },
              { icon: Shield, value: "99.9%", label: "Uptime" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 + i * 0.1, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
                  <stat.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-near-black">{stat.value}</p>
                  <p className="text-xs font-medium text-gray-400">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
