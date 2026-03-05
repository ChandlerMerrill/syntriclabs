"use client";

import AnimateIn from "@/components/ui/AnimateIn";
import { Quote } from "lucide-react";

export default function Mission() {
  return (
    <div>
      <AnimateIn>
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
          Why We Exist
        </p>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-near-black sm:text-4xl lg:text-[2.75rem]">
          Our Mission
        </h2>
      </AnimateIn>

      <div className="mt-12 grid items-start gap-10 lg:grid-cols-5">
        {/* Left — mission text */}
        <div className="lg:col-span-3">
          <AnimateIn delay={0.1}>
            <div className="space-y-6 text-lg leading-relaxed text-gray-700 sm:text-[1.125rem]">
              <p>
                Most AI agencies sell you a demo and disappear. We stick around.
                We work directly with your team to design workflows and
                automation that fit how your business actually runs — not how a
                slide deck says it should.
              </p>
              <p>
                We don&apos;t just hand over tools. We build alongside you, make
                sure your team understands every piece, and stay until the system
                is running in production — not just in a staging environment.
              </p>
            </div>
          </AnimateIn>
        </div>

        {/* Right — pull quote */}
        <div className="lg:col-span-2">
          <AnimateIn delay={0.2}>
            <div className="relative rounded-2xl border border-primary/10 bg-gradient-to-br from-primary-bg to-blue-50/50 p-7">
              <Quote className="mb-4 h-8 w-8 text-primary/20" />
              <blockquote className="text-lg font-semibold leading-snug text-near-black">
                &ldquo;We don&apos;t just build tools — we build alongside you
                and stay until it works.&rdquo;
              </blockquote>
              <div className="mt-4 h-px w-12 bg-primary/20" />
              <p className="mt-3 text-sm font-medium text-gray-500">
                Chandler Merrill, Founder
              </p>
            </div>
          </AnimateIn>
        </div>
      </div>
    </div>
  );
}
