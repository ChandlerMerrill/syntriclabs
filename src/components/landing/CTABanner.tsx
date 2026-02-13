"use client";

import { motion } from "framer-motion";
import AnimateIn from "@/components/ui/AnimateIn";
import Button from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1e40af] via-primary to-primary-light py-28">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0">
        {/* Large glow orbs */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary-lighter/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-white/[0.02] blur-3xl" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Top gradient border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <AnimateIn>
        <div className="relative mx-auto max-w-[1200px] px-6">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm"
              style={{ animation: "pulse-white-glow 1.4s ease-in-out infinite alternate" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Taking on new clients
            </motion.div>

            <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl lg:leading-[1.15]">
              Ready to automate
              <br />
              what matters?
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-white/60">
              Let&apos;s talk about how AI can save your team time and drive real
              results.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                href="/contact"
                variant="secondary"
                size="lg"
                className="!bg-white !text-primary !border-white hover:!bg-gray-50 !shadow-lg !shadow-black/10"
              >
                Book a consultation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                href="/services"
                variant="secondary"
                size="lg"
                className="!bg-transparent !text-white !border-white/25 hover:!bg-white/10 !shadow-none"
              >
                See our demos
              </Button>
            </div>
          </div>
        </div>
      </AnimateIn>
    </section>
  );
}
