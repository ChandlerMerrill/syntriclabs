import type { Metadata } from "next";
import Mission from "@/components/about/Mission";
import Values from "@/components/about/Values";
import AnimateIn from "@/components/ui/AnimateIn";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Syntric Labs — our mission, values, and the team behind practical AI solutions.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24">
      <Mission />
      <Values />

      {/* Founder Bio */}
      <AnimateIn>
        <section>
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
            The Founder
          </h2>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary-bg text-3xl font-bold text-primary">
              SL
            </div>
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-near-black">
                Founder, Syntric Labs
              </h3>
              <p className="mt-3 text-gray-700 leading-relaxed">
                With a background in software engineering and a passion for
                applied AI, the founder of Syntric Labs saw a clear gap: most
                businesses know AI can help them, but few have the technical
                expertise to make it happen. Syntric Labs was built to bridge
                that gap — delivering production-ready AI systems that work
                from day one, with clear ROI and hands-on support.
              </p>
            </div>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}
