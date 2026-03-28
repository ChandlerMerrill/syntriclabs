"use client";

import { motion } from "framer-motion";
import { Code, GraduationCap, ArrowRight } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import TiltCard from "@/components/ui/TiltCard";
import { staggerContainer, fadeUp, popIn } from "@/lib/animations";

const services = [
  {
    icon: Code,
    title: "Custom Software",
    color: "primary-lighter",
    description:
      "We design and build the systems your business actually needs — not off-the-shelf software you'll fight with for years. Client portals, e-commerce platforms, internal dashboards, automated workflows. Scoped to your operations, built to scale with you.",
    features: [
      "Multi-tenant platforms with client portals",
      "E-commerce with inventory and production tracking",
      "Internal tools replacing manual spreadsheet workflows",
      "AI-powered chat and voice agents for customer support",
    ],
    cta: { label: "Tell Us What You Need", href: "/services" },
  },
  {
    icon: GraduationCap,
    title: "Workshops & Training",
    color: "accent-purple",
    description:
      "Your team doesn't need a sales pitch about AI — they need to know what it can actually do for them. We run hands-on workshops that teach your people to build useful solutions, use modern tools effectively, and make better decisions about when (and when not) to automate.",
    features: [
      "Practical skills they can use the next day",
      "A clear picture of what's worth automating",
      "Internal tools they helped build themselves",
      "Confidence to keep improving after we leave",
    ],
    cta: { label: "Ask About Workshops", href: "/contact" },
  },
];

export default function ServicesOverview() {
  return (
    <section className="bg-grid py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel label="What We Do" />
            <h2 className="mt-3 font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
              Two ways we help your business grow
            </h2>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-16 grid gap-8 lg:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {services.map((service) => (
            <motion.div key={service.title} variants={popIn}>
              <TiltCard>
              <div
                className="group flex h-full flex-col rounded-2xl gradient-border-hover bg-bg-secondary p-8 transition-all duration-300 hover:bg-bg-secondary/90 hover:shadow-lg hover:shadow-primary/5 sm:p-10"
              >
                {/* Accent line at top */}
                <div className="gradient-line mb-8 opacity-30 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-bg-tertiary">
                  <service.icon className="h-6 w-6 text-primary-lighter" />
                </div>

                <h3 className="mt-6 font-[family-name:var(--font-rajdhani)] text-2xl font-bold">
                  {service.title}
                </h3>

                <p className="mt-4 leading-relaxed text-text-secondary">
                  {service.description}
                </p>

                <ul className="mt-6 flex flex-col gap-2.5">
                  {service.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-text-secondary"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-cyan" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Button href={service.cta.href} variant="outline" size="sm">
                    {service.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
