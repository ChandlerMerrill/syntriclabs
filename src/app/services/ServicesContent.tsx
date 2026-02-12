"use client";

import { motion } from "framer-motion";
import { Users, Compass, ArrowRight, Sparkles } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import ChatShowcase from "@/components/demos/ChatShowcase";
import VoiceDemo from "@/components/demos/VoiceDemo";

export default function ServicesContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#fafbff]">
        {/* Background effects (subtler than homepage) */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-1/4 left-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/10 via-primary-lighter/15 to-transparent blur-[100px]"
            animate={{
              x: [0, 20, -15, 0],
              y: [0, -15, 10, 0],
              scale: [1, 1.03, 0.98, 1],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-violet-400/8 via-primary/8 to-transparent blur-[100px]"
            animate={{
              x: [0, -18, 12, 0],
              y: [0, 12, -10, 0],
              scale: [1, 0.98, 1.03, 1],
            }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #94A3B830 1px, transparent 1px), linear-gradient(to bottom, #94A3B830 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-6 pb-20 pt-28 sm:pb-24 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-3 w-3 text-primary" />
              </span>
              Services & Demos
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="text-4xl font-extrabold leading-[1.1] tracking-tight text-near-black sm:text-5xl lg:text-[3.5rem]"
            >
              See AI in Action
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-500"
            >
              Explore our AI agents and services. Watch live demos, see how they integrate with your tools, and discover what&apos;s possible.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ── Chat Showcase ── */}
      <section className="bg-white py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <ChatShowcase />
        </div>
      </section>

      {/* ── Voice Demo ── */}
      <section id="voice-demo" className="scroll-mt-24 bg-off-white py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <VoiceDemo />
        </div>
      </section>

      {/* ── Beyond Agents ── */}
      <section className="bg-white py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <SectionHeader
            title="Beyond Agents"
            subtitle="We also help teams build AI capabilities through hands-on training and strategy."
          />

          <div className="grid gap-8 sm:grid-cols-2">
            <AnimateIn delay={0.1}>
              <Card className="flex h-full flex-col">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-near-black">
                  Workshops
                </h3>
                <p className="mt-2 flex-1 text-gray-400">
                  Group training sessions on AI adoption, prompt engineering, and
                  building automation workflows. Get your team up to speed fast.
                </p>
                <div className="mt-4">
                  <Button href="/contact" size="sm" variant="outline">
                    Inquire about workshops
                  </Button>
                </div>
              </Card>
            </AnimateIn>

            <AnimateIn delay={0.2}>
              <Card className="flex h-full flex-col">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50">
                  <Compass className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-near-black">
                  Consulting
                </h3>
                <p className="mt-2 flex-1 text-gray-400">
                  1-on-1 strategy and implementation planning. We help you identify
                  the highest-ROI automation opportunities and build a roadmap.
                </p>
                <div className="mt-4">
                  <Button href="/contact" size="sm" variant="outline">
                    Book a consultation
                  </Button>
                </div>
              </Card>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* ── Mini CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e40af] via-primary to-primary-light py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary-lighter/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <AnimateIn>
          <div className="relative mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Ready to automate?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-white/60">
              Let&apos;s talk about how AI can save your team time and drive real results.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                href="/contact"
                variant="secondary"
                size="lg"
                className="!border-white !bg-white !text-primary !shadow-lg !shadow-black/10 hover:!bg-gray-50"
              >
                Book a consultation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </AnimateIn>
      </section>
    </>
  );
}
