"use client";

import { Mail } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import AnimatedBlob from "@/components/ui/AnimatedBlob";
import ContactForm from "@/components/contact/ContactForm";

const heroBlobs = (
  <>
    <AnimatedBlob size={400} blur={100} intensity={1.35} startVisible initialPosition={{ left: 20, top: 25 }} />
    <AnimatedBlob size={350} blur={100} intensity={1.35} initialDelay={2} initialPosition={{ left: 75, top: 65 }} />
    <AnimatedBlob size={300} blur={100} intensity={1.35} initialDelay={4} />
    <AnimatedBlob size={250} blur={90} intensity={1.35} initialDelay={6} />
    <AnimatedBlob size={350} blur={100} intensity={1.35} initialDelay={8} initialPosition={{ left: 50, top: 40 }} />
    <AnimatedBlob size={280} blur={90} intensity={1.35} initialDelay={10} initialPosition={{ left: 35, top: 75 }} />
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
                  chandler@syntriclabs.com
                </a>
              </span>
            </div>
          </div>
        </AnimateIn>
      </div>
    </InteractiveHeroBackground>
  );
}
