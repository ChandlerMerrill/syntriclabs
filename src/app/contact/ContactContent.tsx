"use client";

import { Mail } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import AnimatedBlob from "@/components/ui/AnimatedBlob";
import ContactForm from "@/components/contact/ContactForm";
import {
  contactPrimary,
  contactSecondary,
  contactAccentRight,
  contactAccentSmall,
} from "@/lib/blob-paths";

const heroBlobs = (
  <>
    <AnimatedBlob
      config={contactPrimary}
      variant="primary"
      intensity={2.5}
      className="absolute -top-1/4 left-1/6 h-[500px] w-[400px] rounded-full blur-[150px]"
    />
    <AnimatedBlob
      config={contactSecondary}
      variant="secondary"
      intensity={2.5}
      className="absolute -bottom-1/4 right-1/6 h-[500px] w-[350px] rounded-full blur-[50px]"
    />
    <AnimatedBlob
      config={contactAccentRight}
      variant="accent"
      intensity={5}
      className="absolute top-1/3 right-0 h-[300px] w-[300px] rounded-full blur-[100px]"
    />
    <AnimatedBlob
      config={contactAccentSmall}
      variant="accent"
      intensity={3}
      className="absolute -top-1/6 right-1/3 h-[250px] w-[250px] rounded-full blur-[50px]"
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
