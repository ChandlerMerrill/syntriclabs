"use client";

import { Users, Compass } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimateIn from "@/components/ui/AnimateIn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ChatDemo from "@/components/demos/ChatDemo";
import VoiceDemo from "@/components/demos/VoiceDemo";

export default function ServicesContent() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24">
      <SectionHeader
        title="Our Services"
        subtitle="From intelligent agents to strategic consulting — explore what we build and see it in action."
      />

      {/* Chat Demo */}
      <AnimateIn>
        <section className="mb-20">
          <ChatDemo />
        </section>
      </AnimateIn>

      {/* Divider */}
      <div className="my-16 h-px bg-gray-100" />

      {/* Voice Demo */}
      <AnimateIn>
        <section className="mb-20">
          <VoiceDemo />
        </section>
      </AnimateIn>

      {/* Divider */}
      <div className="my-16 h-px bg-gray-100" />

      {/* Additional Services */}
      <AnimateIn>
        <SectionHeader
          title="Beyond Agents"
          subtitle="We also help teams build AI capabilities through hands-on training and strategy."
        />
      </AnimateIn>

      <div className="grid gap-8 sm:grid-cols-2">
        <AnimateIn delay={0.1}>
          <Card className="flex h-full flex-col">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-near-black">
              Workshops
            </h3>
            <p className="mt-2 flex-1 text-gray-400">
              Group training sessions on AI adoption, prompt engineering, and
              building automation workflows. Get your team up to speed fast.
            </p>
            <div className="mt-4">
              <Button href="/contact" size="sm" variant="outline">
                Inquire about workshops
              </Button>
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <Card className="flex h-full flex-col">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50">
              <Compass className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-near-black">
              Consulting
            </h3>
            <p className="mt-2 flex-1 text-gray-400">
              1-on-1 strategy and implementation planning. We help you identify
              the highest-ROI automation opportunities and build a roadmap.
            </p>
            <div className="mt-4">
              <Button href="/contact" size="sm" variant="outline">
                Book a consultation
              </Button>
            </div>
          </Card>
        </AnimateIn>
      </div>
    </div>
  );
}
