"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import AnimatedBlob from "@/components/ui/AnimatedBlob";

const heroBlobs = (
  <>
    <AnimatedBlob size={500} blur={100} startVisible initialPosition={{ left: 30, top: 25 }} />
    <AnimatedBlob size={400} blur={100} initialDelay={3} initialPosition={{ left: 70, top: 60 }} />
    <AnimatedBlob size={200} blur={80} initialDelay={6} />
  </>
);

export default function AboutHero() {
  return (
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
              <Heart className="h-3 w-3 text-primary" />
            </span>
            About Us
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-4xl font-extrabold leading-[1.1] tracking-tight text-near-black sm:text-5xl lg:text-[3.5rem]"
          >
            Built to Help You Grow
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-500"
          >
            We&apos;re a small team with a clear focus — building practical AI
            systems that integrate into your business and deliver real results.
          </motion.p>
        </div>
      </div>
    </InteractiveHeroBackground>
  );
}
