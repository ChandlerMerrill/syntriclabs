"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import ContactForm from "@/components/contact/ContactForm";

const heroBlobs = (
  <>
    <motion.div
      className="absolute -top-1/4 left-1/6 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-primary/25 via-primary-lighter/30 to-transparent blur-[100px]"
      animate={{
        x: [0, 15, -10, 0],
        y: [0, -10, 8, 0],
        scale: [1, 1.02, 0.98, 1],
      }}
      transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-1/4 right-1/6 h-[350px] w-[350px] rounded-full bg-gradient-to-tl from-violet-400/20 via-primary/20 to-transparent blur-[100px]"
      animate={{
        x: [0, -12, 10, 0],
        y: [0, 10, -8, 0],
        scale: [1, 0.98, 1.02, 1],
      }}
      transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/3 right-0 h-[300px] w-[300px] rounded-full bg-gradient-to-bl from-blue-400/20 via-primary/15 to-transparent blur-[100px]"
      animate={{
        x: [0, -20, 8, 0],
        y: [0, -8, 15, 0],
        scale: [1, 1.04, 0.97, 1],
      }}
      transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -top-1/6 right-1/3 h-[250px] w-[250px] rounded-full bg-gradient-to-br from-sky-300/20 via-blue-400/15 to-transparent blur-[90px]"
      animate={{
        x: [0, 10, -14, 0],
        y: [0, 12, -6, 0],
        scale: [1, 0.97, 1.03, 1],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
    />
  </>
);

export default function ContactContent() {
  return (
    <InteractiveHeroBackground blobs={heroBlobs}>
      <div className="mx-auto max-w-2xl px-6 py-24">
        <AnimateIn>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Get in touch
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-near-black sm:text-5xl">
            Let&apos;s build something{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              together
            </span>
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Tell us about your project or the challenge you&apos;re facing.
            We&apos;ll get back to you within 24 hours.
          </p>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <div className="mt-10 rounded-2xl border border-gray-200/60 bg-white/80 p-8 shadow-lg shadow-gray-200/50 backdrop-blur-sm">
            <ContactForm />

            <div className="mt-8 flex items-center gap-3 border-t border-gray-200/60 pt-6">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">
                Or email us directly at{" "}
                <a
                  href="mailto:hello@syntriclabs.com"
                  className="font-medium text-primary hover:underline"
                >
                  hello@syntriclabs.com
                </a>
              </span>
            </div>
          </div>
        </AnimateIn>
      </div>
    </InteractiveHeroBackground>
  );
}
