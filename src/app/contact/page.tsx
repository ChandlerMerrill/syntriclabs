import type { Metadata } from "next";
import { Mail } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";
import AnimateIn from "@/components/ui/AnimateIn";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Syntric Labs. Tell us about your project and we'll respond within 24 hours.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <AnimateIn>
          <h1 className="text-3xl font-bold tracking-tight text-near-black sm:text-4xl">
            Let&apos;s build something together
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Tell us about your project or the challenge you&apos;re facing.
            We&apos;ll get back to you within 24 hours.
          </p>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <div className="mt-10">
            <ContactForm />
          </div>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <div className="mt-12 flex items-center gap-3 border-t border-gray-100 pt-8">
            <Mail className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-400">
              Or email us directly at{" "}
              <a
                href="mailto:hello@syntriclabs.com"
                className="font-medium text-primary hover:underline"
              >
                hello@syntriclabs.com
              </a>
            </span>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
