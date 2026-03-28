"use client";

import { motion } from "framer-motion";
import { ArrowRight, Users, Lightbulb, Settings, Shield } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import GradientDivider from "@/components/ui/GradientDivider";
import { staggerContainer, staggerFast, fadeUp, popIn } from "@/lib/animations";

const audiences = [
  "Teams drowning in manual processes who know there's a better way",
  "Business owners who want to understand what AI can (and can't) do",
  "Operations managers looking to streamline without hiring more staff",
];

const topics = [
  { icon: Lightbulb, label: "Identify high-value automation opportunities" },
  { icon: Settings, label: "Build internal tools with modern AI-assisted workflows" },
  { icon: Users, label: "Know when to automate and when a process just needs fixing" },
  { icon: Shield, label: "Ethical and practical considerations for AI in business" },
];

const iconHover = {
  scale: 1.1,
  transition: { type: "spring" as const, stiffness: 400, damping: 20 },
};

export default function Workshops() {
  return (
    <section className="bg-grid py-24 sm:py-32">
      <GradientDivider className="mb-24 sm:mb-32" />
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel label="Teach" />
            <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
              Give your team the skills to build — not just buy
            </h2>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-4 max-w-2xl leading-relaxed text-text-secondary">
            Most businesses are told they need to adopt AI. Nobody shows them
            how. We go into companies and run hands-on workshops that teach teams
            to use modern tools effectively and ethically — with a focus on
            building things that actually help.
          </motion.p>
          <motion.p variants={fadeUp} className="mt-3 max-w-2xl leading-relaxed text-text-secondary">
            This isn&apos;t a lecture. Your team leaves with working tools they
            built themselves, a clear understanding of what&apos;s worth
            automating, and the confidence to keep going after we leave.
          </motion.p>
        </motion.div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          {/* Who it's for */}
          <motion.div
            variants={staggerFast}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.h3 variants={fadeUp} className="font-[family-name:var(--font-rajdhani)] text-xl font-bold">
              Who it&apos;s for
            </motion.h3>
            <ul className="mt-4 flex flex-col gap-3">
              {audiences.map((item) => (
                <motion.li
                  key={item}
                  variants={fadeUp}
                  className="flex items-start gap-3 text-sm leading-relaxed text-text-secondary"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-purple" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* What teams learn */}
          <motion.div
            variants={staggerFast}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.h3 variants={fadeUp} className="font-[family-name:var(--font-rajdhani)] text-xl font-bold">
              What teams learn
            </motion.h3>
            <ul className="mt-4 flex flex-col gap-3">
              {topics.map((item) => (
                <motion.li
                  key={item.label}
                  variants={popIn}
                  className="flex items-center gap-3 text-sm text-text-secondary"
                >
                  <motion.div
                    whileHover={iconHover}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-tertiary transition-colors hover:border-accent-cyan/30 hover:bg-accent-cyan/[0.08]"
                  >
                    <item.icon className="h-4 w-4 text-accent-cyan" />
                  </motion.div>
                  {item.label}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          className="mt-12"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <Button href="/contact" variant="outline">
            Inquire About Workshops
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
