import type { Metadata } from "next";
import Mission from "@/components/about/Mission";
import Values from "@/components/about/Values";
import AnimateIn from "@/components/ui/AnimateIn";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import AboutHero from "./AboutHero";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Syntric Labs — our mission, values, and the team behind practical AI solutions.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />

      {/* Mission */}
      <section className="relative bg-white py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.50]"
          style={{
            backgroundImage: "radial-gradient(circle, #9EA6B0 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6">
          <Mission />
        </div>
      </section>

      {/* Values */}
      <section className="relative bg-off-white py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: "radial-gradient(circle, #687A90 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6">
          <Values />
        </div>
      </section>

      {/* Founder Bio */}
      <section className="relative bg-off-white py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: "radial-gradient(circle, #687A90 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6">
          <AnimateIn>
            <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
              The Founder
            </p>
            <div className="mx-auto max-w-4xl">
              <div className="overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-lg shadow-gray-200/50">
                <div className="grid sm:grid-cols-5">
                  {/* Founder Image — larger, full-height */}
                  <div className="relative min-h-[280px] sm:col-span-2 sm:min-h-0">
                    <Image
                      src="/images/chandler.jpg"
                      alt="Chandler Merrill"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Founder Bio */}
                  <div className="p-8 sm:col-span-3 sm:p-10">
                    <h3 className="text-2xl font-extrabold text-near-black">
                      Chandler Merrill
                    </h3>

                    <div className="mt-5 space-y-4 leading-relaxed text-gray-500">
                      <p>
                        Chandler led systems and technology at a growing
                        startup — designing internal tools, automating workflows,
                        and building the infrastructure behind operations and
                        customer experience.
                      </p>
                      <p>
                        That work showed him how hard it is for most businesses
                        to adopt AI effectively. He founded Syntric Labs to close
                        that gap: helping small and mid-sized companies design
                        and deploy practical AI systems that integrate into their
                        existing workflows.
                      </p>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <a
                        href="https://www.linkedin.com/in/chandler-merrill-b11457117/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        Connect on LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Mini CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e40af] via-primary to-primary-light py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary-lighter/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <AnimateIn>
          <div className="relative mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Want to see what we can build for you?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-white/60">
              Book a free 30-minute strategy session. No pitch — just an honest
              look at where AI can help your business.
            </p>
            <div className="mt-8">
              <a
                href="https://calendly.com/chandlermerrill-r/30min"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="!border-white !bg-white !text-primary !shadow-lg !shadow-black/10 hover:!bg-gray-50"
                >
                  Book a free consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </AnimateIn>
      </section>
    </>
  );
}
