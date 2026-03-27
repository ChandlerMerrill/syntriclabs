"use client";

import { Mail, MessageSquare, Search, Rocket } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import InteractiveHeroBackground from "@/components/ui/InteractiveHeroBackground";
import AnimatedBlob from "@/components/ui/AnimatedBlob";
import ContactForm from "@/components/contact/ContactForm";

const heroBlobs = (
  <>
    <AnimatedBlob size={400} blur={100} intensity={1.35} position={{ left: 20, top: 25 }} color="blue" variant={1} duration={22} burstDuration={4.5} />
    <AnimatedBlob size={350} blur={100} intensity={1.35} position={{ left: 75, top: 65 }} color="violet" variant={2} duration={26} burstDuration={5.5} delay={1} />
    <AnimatedBlob size={300} blur={100} intensity={1.35} position={{ left: 45, top: 50 }} color="indigo" variant={3} duration={20} burstDuration={5} delay={2} hideOnMobile />
    <AnimatedBlob size={250} blur={90} intensity={1.35} position={{ left: 60, top: 30 }} color="blue" variant={4} duration={18} burstDuration={4} delay={3} hideOnMobile />
    <AnimatedBlob size={350} blur={100} intensity={1.35} position={{ left: 50, top: 40 }} color="violet" variant={1} duration={24} burstDuration={6} delay={1.5} hideOnMobile />
    <AnimatedBlob size={280} blur={90} intensity={1.35} position={{ left: 35, top: 75 }} color="indigo" variant={3} duration={22} burstDuration={5} delay={4} hideOnMobile />
  </>
);

const nextSteps = [
  {
    icon: MessageSquare,
    title: "We respond within 24 hours",
    description: "With an honest take on whether we can help.",
  },
  {
    icon: Search,
    title: "30-minute discovery call",
    description: "We learn your workflows, pain points, and goals.",
  },
  {
    icon: Rocket,
    title: "Proposal within a week",
    description: "A concrete plan with scope, timeline, and pricing.",
  },
];

export default function ContactContent() {
  return (
    <InteractiveHeroBackground blobs={heroBlobs}>
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-28 sm:pt-32">
        <AnimateIn>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Get in touch
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-near-black sm:text-5xl">
            Tell us what&apos;s{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              slowing you down
            </span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-500">
            Describe the problem or the project. We&apos;ll respond within
            24 hours with an honest take on whether we can help.
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
                  href="mailto:chandler@syntriclabs.com"
                  className="font-medium text-primary hover:underline"
                >
                  chandler@syntriclabs.com
                </a>
              </span>
            </div>
          </div>
        </AnimateIn>

        {/* What happens next */}
        <AnimateIn delay={0.2}>
          <div className="mt-10 rounded-2xl border border-gray-200/60 bg-white/80 p-8 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              What happens next
            </p>
            <div className="mt-6 space-y-6">
              {nextSteps.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    {i < nextSteps.length - 1 && (
                      <div className="mt-2 h-full w-px bg-gradient-to-b from-primary/15 to-transparent" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="font-semibold text-near-black">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>
      </div>
    </InteractiveHeroBackground>
  );
}
