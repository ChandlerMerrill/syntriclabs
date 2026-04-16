"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Linkedin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GradientDivider from "@/components/ui/GradientDivider";
import { staggerContainer, fadeUp, popIn } from "@/lib/animations";

export default function FounderBio() {
  const photoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: photoRef,
    offset: ["start end", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <section className="bg-grid py-24 sm:py-32">
      <GradientDivider className="mb-24 sm:mb-32" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-5">
          {/* Photo with parallax */}
          <motion.div
            className="lg:col-span-2"
            variants={popIn}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div ref={photoRef} className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border border-border">
              <motion.div style={{ y: photoY }}>
                <Image
                  src="/images/chandler.jpg"
                  alt="Chandler Merrill, founder of Syntric Labs"
                  width={400}
                  height={500}
                  className="h-auto w-full object-cover"
                />
              </motion.div>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
            </div>
          </motion.div>

          {/* Bio */}
          <motion.div
            className="lg:col-span-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-text-accent">
              Founder & Builder
            </motion.p>
            <motion.h3 variants={fadeUp} className="mt-2 font-[family-name:var(--font-rajdhani)] text-3xl font-bold">
              Chandler Merrill
            </motion.h3>
            <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-text-secondary">
              Chandler is a software engineer and builder who works directly with
              small businesses to design and ship custom platforms. His approach
              is hands-on: he&apos;s in the meetings, he&apos;s writing the
              code, and he&apos;s available when something breaks. No account
              managers, no handoffs, no layers between you and the person
              building your system.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 flex items-center gap-4">
              <a
                href="https://www.linkedin.com/in/chandler-merrill-b11457117/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          className="mt-24 text-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.h2 variants={fadeUp} className="font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
            Let&apos;s talk about what you&apos;re building.
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-text-secondary">
            Whether you&apos;ve got a clear project in mind or you&apos;re
            just starting to think about what better systems could look like —
            the first step is a conversation.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8">
            <Button render={<a href="https://calendly.com/chandler-syntriclabs/30min" target="_blank" rel="noopener noreferrer" />} size="lg">
              Book a Discovery Call
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
