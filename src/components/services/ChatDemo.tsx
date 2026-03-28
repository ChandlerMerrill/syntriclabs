"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import { staggerContainer, fadeUp } from "@/lib/animations";

export default function ChatDemo() {
  return (
    <section className="bg-grid py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel label="Try It" />
            <h2 className="mt-3 font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
              Ask our AI agent anything about Syntric
            </h2>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-text-secondary">
            The chat widget in the corner of this page is a live AI agent. It
            knows about our services, can help you book a consultation, and can
            answer questions about how we work.
          </motion.p>
          <motion.p variants={fadeUp} className="mt-3 text-sm text-text-secondary/70">
            This is the same technology we deploy for clients — trained on
            their business, handling real customer conversations.
          </motion.p>

          <motion.div variants={fadeUp}>
            <motion.div
              className="mt-8 inline-flex items-center gap-3 rounded-xl border border-accent-cyan/20 bg-accent-cyan/[0.06] px-5 py-3"
              animate={{
                y: [0, -4, 0],
                boxShadow: [
                  "0 0 0px rgba(6, 182, 212, 0)",
                  "0 0 20px rgba(6, 182, 212, 0.1)",
                  "0 0 0px rgba(6, 182, 212, 0)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <MessageSquare className="h-5 w-5 text-accent-cyan" />
              <span className="text-sm font-medium text-text-primary">
                Look for the chat icon in the bottom-right corner
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
