"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import TiltCard from "@/components/ui/TiltCard";
import { staggerContainer, fadeUp, popIn } from "@/lib/animations";

const projects = [
  {
    name: "Esoteric Design Lab",
    description:
      "Multi-tenant e-commerce platform with client portals, kit builder, design review tools, and production tracking. Built solo in ~2 weeks.",
    href: "https://esotericdesignlab-platform.vercel.app/",
    tags: ["E-Commerce", "Multi-Tenant", "Client Portal"],
  },
  {
    name: "Shamrock Plumbing",
    description:
      "Modern, professional website for a local plumbing company. Clean design, fast load times, built to convert visitors into service calls.",
    href: "https://shamrock-site.vercel.app",
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
          className="mt-12 grid gap-6 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {projects.map((project) => (
            <motion.div key={project.name} variants={popIn}>
              <TiltCard>
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary transition-all duration-300 hover:border-border-hover hover:bg-bg-secondary/90 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Topography texture header */}
                <div className="relative h-32 overflow-hidden">
                  <img
                    src="/svg/topography.svg"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-[0.12] transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg-secondary" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 pb-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold">
                        {project.name}
                      </h3>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-text-secondary transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-lighter" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-8 pt-4">
                  {/* Accent line */}
                  <div className="gradient-line mb-4 opacity-30 transition-opacity duration-300 group-hover:opacity-100" />

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
