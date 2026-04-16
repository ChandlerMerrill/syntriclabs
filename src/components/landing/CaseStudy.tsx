"use client";

import { motion } from "framer-motion";
import {
  ShoppingCart,
  Users,
  LayoutDashboard,
  Palette,
  CreditCard,
  ArrowRight,
  Quote,
} from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/button";
import GradientDivider from "@/components/ui/GradientDivider";
import FloatingIsland from "@/components/ui/FloatingIsland";
import { useCountUp } from "@/hooks/useCountUp";
import { staggerContainer, fadeUp, popIn, springHover } from "@/lib/animations";

const features = [
  { icon: ShoppingCart, label: "E-commerce storefront with custom kit builder" },
  { icon: Users, label: "Client portal for order management and design review" },
  { icon: LayoutDashboard, label: "Admin dashboard for inventory, production, and vendors" },
  { icon: Palette, label: "Design binder with commenting and collaborative whiteboard" },
  { icon: CreditCard, label: "Payment processing with automated invoice and order flows" },
];

export default function CaseStudy() {
  const cost = useCountUp({ end: 10, prefix: "~$", suffix: "k" });
  const time = useCountUp({ end: 2, prefix: "~", suffix: " wks" });

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
            <SectionLabel label="Proof of Work" />
            <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">
              A $30k quote. We did it for a third of that — with more features.
            </h2>
          </motion.div>
        </motion.div>

        <div className="mt-12 grid items-start gap-12 lg:grid-cols-5">
          {/* Story */}
          <div className="lg:col-span-3">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              <motion.div variants={fadeUp} className="space-y-5 leading-relaxed text-text-secondary">
                <p>
                  A clothing and gear supplier came to us with a problem: their
                  entire business ran on spreadsheets. Order tracking, inventory,
                  client communications — all manual. They&apos;d been quoted
                  $30,000 by another agency for a basic e-commerce setup.
                </p>
                <p>
                  We built them a full multi-tenant platform in about two weeks.
                  The result: their manual workflows disappeared. The platform
                  handles what used to take hours of spreadsheet wrangling. And
                  it cost roughly $10,000 — a third of the competing quote, with
                  significantly more functionality.
                </p>
              </motion.div>

              {/* Feature list */}
              <motion.ul variants={fadeUp} className="mt-8 flex flex-col gap-3">
                {features.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center gap-3 text-sm text-text-primary"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-tertiary">
                      <f.icon className="h-4 w-4 text-accent-cyan" />
                    </div>
                    {f.label}
                  </li>
                ))}
              </motion.ul>

              <motion.div variants={fadeUp} className="mt-8">
                <Button
                  render={<a href="https://esotericdesignlab-platform.vercel.app/" target="_blank" rel="noopener noreferrer" />}
                  variant="secondary"
                >
                  See the Platform Live
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Stats + Testimonial */}
          <FloatingIsland className="lg:col-span-2">
            <motion.div
              className="space-y-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              {/* Stats */}
              <motion.div variants={popIn} className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={springHover}
                  className="rounded-xl border border-border bg-bg-secondary p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5"
                >
                  <p ref={cost.ref} className="font-[family-name:var(--font-rajdhani)] text-3xl font-bold text-primary-lighter">
                    {cost.display}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    vs. $30k competing quote
                  </p>
                </motion.div>
                <motion.div
                  whileHover={springHover}
                  className="rounded-xl border border-border bg-bg-secondary p-5 transition-shadow hover:shadow-lg hover:shadow-accent-cyan/5"
                >
                  <p ref={time.ref} className="font-[family-name:var(--font-rajdhani)] text-3xl font-bold text-accent-cyan">
                    {time.display}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Solo build time
                  </p>
                </motion.div>
              </motion.div>

              {/* Testimonial */}
              <motion.div variants={popIn}>
                <div className="rounded-xl border border-accent-purple/20 bg-gradient-to-br from-accent-purple/[0.10] to-accent-cyan/[0.07] p-6">
                  <Quote className="mb-3 h-6 w-6 text-accent-purple/60" />
                  <blockquote className="text-[0.95rem] leading-relaxed font-medium text-text-primary">
                    &ldquo;We&apos;re never going back. Syntric built exactly what
                    we needed, faster than we thought possible. We won&apos;t work
                    with anyone else — and we&apos;re telling every business we
                    partner with to do the same.&rdquo;
                  </blockquote>
                  <div className="mt-4 h-px w-10 bg-gradient-to-r from-accent-purple/30 to-transparent" />
                  <p className="mt-3 text-sm text-text-secondary">
                    Founder, Esoteric Design Lab
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </FloatingIsland>
        </div>
      </div>
    </section>
  );
}
