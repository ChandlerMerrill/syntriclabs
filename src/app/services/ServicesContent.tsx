"use client";

import { motion } from "framer-motion";
import { Users, Compass, ArrowRight, Sparkles, Clock } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import ChatShowcase from "@/components/demos/ChatShowcase";
import VoiceDemo from "@/components/demos/VoiceDemo";

const heroBlobs = (
  <>
    <motion.div
      className="absolute -top-1/4 left-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/30 via-primary-lighter/35 to-transparent blur-[100px]"
      animate={{
        x: [0, 20, -15, 0],
        y: [0, -15, 10, 0],
        scale: [1, 1.03, 0.98, 1],
      }}
      transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-violet-400/[0.22] via-primary/[0.22] to-transparent blur-[100px]"
      animate={{
        x: [0, -18, 12, 0],
        y: [0, 12, -10, 0],
        scale: [1, 0.98, 1.03, 1],
      }}
      transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
    />
  </>
);

export default function ServicesContent() {
  return (
    <>
      {/* ── Hero ── */}
      <InteractiveHeroBackground blobs={heroBlobs}>
        <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-[4.2rem] sm:pb-28 sm:pt-[4.8rem]">
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
              Explore our AI agents and services. Watch live demos, see how they
              integrate with your tools, and discover what&apos;s possible.
            </motion.p>
          </div>
        </div>
      </InteractiveHeroBackground>

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
      <section id="workshops" className="bg-white py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <SectionHeader
            title="Beyond Agents"
            subtitle="We also help teams build AI capabilities through hands-on training and strategy."
          />

          <div className="grid gap-8 sm:grid-cols-2">
            <AnimateIn delay={0.1}>
              <div className="group h-full">
                <Card
                  hover={false}
                  className="relative flex h-full flex-col overflow-hidden p-7 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-purple-200 group-hover:shadow-xl group-hover:shadow-purple-100/50"
                >
                  <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-purple-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 transition-colors duration-300 group-hover:bg-purple-100">
                    <Users className="h-7 w-7 text-purple-600" />
                  </div>

                  <h3 className="text-xl font-bold text-near-black">
                    Workshops
                  </h3>
                  <p className="mt-3 flex-1 leading-relaxed text-gray-500">
                    Join one of our upcoming group workshops to learn about AI
                    adoption, prompt engineering, and automation
                    workflows&nbsp;&mdash; or request a private workshop
                    tailored to your team&apos;s goals. We&apos;ll help your
                    team understand what&apos;s possible with AI and how to
                    implement it themselves. Fill out the contact form to learn
                    more about upcoming sessions and pricing.
                  </p>
                  <div className="mt-6">
                    <Button href="/contact" size="md" variant="outline">
                      Learn more
                    </Button>
                  </div>
                </Card>
              </div>
            </AnimateIn>

            <AnimateIn delay={0.2}>
              <div className="group h-full">
                <Card
                  hover={false}
                  className="relative flex h-full flex-col overflow-hidden p-7 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-amber-200 group-hover:shadow-xl group-hover:shadow-amber-100/50"
                >
                  <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-amber-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="mb-6 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 transition-colors duration-300 group-hover:bg-amber-100">
                      <Compass className="h-7 w-7 text-amber-600" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                      <Clock className="h-3.5 w-3.5" />
                      Free for a limited time
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-near-black">
                    Consulting
                  </h3>
                  <p className="mt-3 flex-1 leading-relaxed text-gray-500">
                    Book a free 30-minute strategy session to identify your
                    highest-ROI automation opportunities and build a clear
                    implementation roadmap. Whether you&apos;re just exploring
                    AI or ready to scale, we&apos;ll help you cut through the
                    noise and focus on what actually moves the needle.
                  </p>
                  <div className="mt-6">
                    <a
                      href="https://calendly.com/chandlermerrill-r/30min"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="md" variant="primary">
                        Book a free consultation
                      </Button>
                    </a>
                  </div>
                </Card>
              </div>
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
              Let&apos;s talk about how AI can save your team time and drive
              real results.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://calendly.com/chandlermerrill-r/30min"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="!border-white !bg-white !text-primary !shadow-lg !shadow-black/10 hover:!bg-gray-50"
                >
                  Book a consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </AnimateIn>
      </section>
    </>
  );
}
