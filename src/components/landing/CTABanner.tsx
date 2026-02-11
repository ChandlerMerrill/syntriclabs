"use client";

import AnimateIn from "@/components/ui/AnimateIn";
import Button from "@/components/ui/Button";

export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary-lighter py-24">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/5 blur-2xl" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <AnimateIn>
        <div className="relative mx-auto max-w-[1200px] px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to automate what matters?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Let&apos;s talk about how AI can save your team time and drive real
            results.
          </p>
          <div className="mt-10">
            <Button
              href="/contact"
              variant="secondary"
              size="lg"
              className="!bg-white !text-primary !border-white hover:!bg-gray-50 !shadow-lg !shadow-black/10"
            >
              Book a consultation
            </Button>
          </div>
        </div>
      </AnimateIn>
    </section>
  );
}
