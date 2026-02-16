import type { Metadata } from "next";
import Mission from "@/components/about/Mission";
import Values from "@/components/about/Values";
import AnimateIn from "@/components/ui/AnimateIn";
import Image from "next/image";
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
      <section className="relative bg-white py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.50]"
          style={{
            backgroundImage: "radial-gradient(circle, #9EA6B0 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6">
          <AnimateIn>
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
              The Founder
            </h2>

            <div className="mx-auto max-w-4xl">
              <div className="flex flex-col gap-10 sm:flex-row sm:items-start">
                {/* Founder Image */}
                <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl sm:h-48 sm:w-48">
                  <Image
                    src="/images/chandler.jpg"
                    alt="Chandler Merrill"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>

                {/* Founder Bio */}
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold text-near-black">
                    Chandler Merrill — Founder, Syntric Labs
                  </h3>

                  <div className="mt-4 space-y-4 leading-relaxed text-gray-700">
                    <p>
                      Chandler Merrill studied biomedical physics, originally
                      intending to pursue medicine with the goal of improving
                      people&apos;s lives in a tangible way. During that time, he
                      discovered a deep interest in software and systems — and the
                      realization that technology could create impact at scale.
                    </p>

                    <p>
                      He later led systems and technology inside a growing startup,
                      where he designed internal tools, automated workflows, and
                      built infrastructure to support operations and customer
                      experience. Through that work, he saw how difficult it is for
                      most businesses to implement AI and automation effectively.
                    </p>

                    <p>
                      He founded Syntric Labs to help small and mid-sized companies
                      design and deploy practical AI systems that integrate into
                      their existing workflows.
                    </p>

                    <p>
                      Outside of work, Chandler spends his time climbing, camping,
                      and exploring the mountains — drawn to the same
                      problem-solving and resilience that shape his approach to
                      building technology.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
