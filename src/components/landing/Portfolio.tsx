"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import TiltCard from "@/components/ui/TiltCard";
import { staggerContainer, fadeUp, popIn } from "@/lib/animations";

const projects = [
  {
    name: "Esoteric Design Lab",
    description:
      "Multi-tenant e-commerce platform with client portals, kit builder, design review tools, and production tracking. Built in ~3–4 weeks, in production and still growing five months later.",
    href: "https://www.esotericdesignlab.com/",
    image: "/images/work/esoteric.jpg",
    tags: ["E-Commerce", "Multi-Tenant", "Client Portal"],
  },
  {
    name: "Tally",
    description:
      "Guides snap receipts out on the trip and an agent reads, categorizes, and totals them. Back home, the expense report and trip summary are already written up.",
    href: "https://post-trip.vercel.app/",
    image: "/images/work/tally.jpg",
    tags: ["Expense Tracking", "AI Agent", "Reporting"],
  },
  {
    name: "Shamrock Plumbing",
    description:
      "Modern, professional website for a local plumbing company. Clean design, fast load times, built to convert visitors into service calls.",
    href: "https://shamrock-site.vercel.app",
    image: "/images/work/shamrock.jpg",
    tags: ["Business Website", "Lead Generation"],
  },
];

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel label="Our Work" />
            <h2 className="mt-3 font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
              Live projects
            </h2>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {projects.map((project) => (
            <motion.div key={project.name} variants={popIn} className="h-full">
              <TiltCard className="h-full">
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary transition-all duration-300 hover:border-border-hover hover:shadow-xl hover:shadow-primary/10"
                >
                  {/* Live site screenshot */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-bg-tertiary">
                    <Image
                      src={project.image}
                      alt={`${project.name} homepage`}
                      width={1400}
                      height={875}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                      className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                    {/* Fade the shot into the card body */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-bg-secondary" />
                    {/* Brand hairline, lights up on hover */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-purple to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-70" />
                  </div>

                  <div className="flex flex-1 flex-col p-7">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold">
                        {project.name}
                      </h3>
                      <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-text-secondary transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-lighter" />
                    </div>

                    {/* Accent line */}
                    <div className="gradient-line my-4 opacity-30 transition-opacity duration-300 group-hover:opacity-100" />

                    <p className="text-sm leading-relaxed text-text-secondary">
                      {project.description}
                    </p>

                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-bg-tertiary px-3 py-1 text-xs text-text-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
