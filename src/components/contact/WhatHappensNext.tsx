"use client";

import { motion } from "framer-motion";
import { Clock, Phone, FileText } from "lucide-react";
import { staggerContainer, popIn } from "@/lib/animations";

const steps = [
  {
    icon: Clock,
    title: "We respond within 24 hours",
    description:
      "Every message gets a real reply — not an autoresponder. We'll review what you've shared and come back with initial thoughts.",
  },
  {
    icon: Phone,
    title: "Discovery call",
    description:
      "A 30-minute conversation to understand your business, your bottlenecks, and what a solution could look like. No sales pressure — just an honest assessment.",
  },
  {
    icon: FileText,
    title: "Scope & proposal",
    description:
      "If there's a fit, we'll put together a clear proposal: what we'd build, how long it would take, and what it would cost. No surprises.",
  },
];

export default function WhatHappensNext() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      <motion.h2 variants={popIn} className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold">
        Here&apos;s what to expect
      </motion.h2>

      <div className="mt-8 flex flex-col gap-6">
        {steps.map((step, i) => (
          <motion.div key={step.title} variants={popIn} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-secondary">
                <step.icon className="h-5 w-5 text-primary-lighter" />
              </div>
              {i < steps.length - 1 && (
                <motion.div
                  className="mt-2 w-px bg-gradient-to-b from-accent-purple/30 to-accent-cyan/30"
                  initial={{ height: 0 }}
                  whileInView={{ height: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.15, ease: [0.16, 1, 0.3, 1] as const }}
                />
              )}
            </div>
            <div className="pb-6">
              <h3 className="font-medium text-text-primary">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
