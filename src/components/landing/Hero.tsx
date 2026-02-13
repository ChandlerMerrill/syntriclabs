"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import AnimatedBlob from "@/components/ui/AnimatedBlob";
import { ArrowRight, Zap, Workflow, Plug, GraduationCap } from "lucide-react";

const blobs = (
  <>
    <AnimatedBlob size={700} blur={100} startVisible initialPosition={{ left: 30, top: 25 }} />
    <AnimatedBlob size={600} blur={100} initialDelay={3} initialPosition={{ left: 70, top: 65 }} />
    <AnimatedBlob size={400} blur={100} initialDelay={6} />
    <AnimatedBlob size={200} blur={80} initialDelay={9} />
  </>
);

export default function Hero() {
  return (
    <InteractiveHeroBackground blobs={blobs}>
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-32 sm:pb-32 sm:pt-40 lg:pb-40 lg:pt-48">
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
            <br className="hidden sm:block" /> delivers ROI.
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
            <a
              href="https://calendly.com/chandlermerrill-r/30min"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="lg">
                Book a consultation
              </Button>
            </a>
          </motion.div>

          {/* Value prop labels */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: "easeOut" }}
            className="mx-auto mt-16 flex max-w-lg flex-col items-center justify-center gap-4 sm:mt-20 sm:flex-row sm:gap-6"
          >
            {[
              { icon: Workflow, label: "Workflow Automation" },
              { icon: Plug, label: "Seamless Integrations" },
              { icon: GraduationCap, label: "Tech Education" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.65 + i * 0.1,
                  ease: "easeOut",
                }}
                className="flex items-center gap-3 rounded-full border border-gray-100 bg-white/80 px-5 py-2.5 shadow-sm backdrop-blur-sm"
              >
                <item.icon className="h-7 w-7 text-primary" />
                <span className="text-base font-medium text-gray-600">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </InteractiveHeroBackground>
  );
}
