import type { Metadata } from "next";
import ContactHero from "@/components/contact/ContactHero";
import ContactForm from "@/components/contact/ContactForm";
import WhatHappensNext from "@/components/contact/WhatHappensNext";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Syntric Labs. Tell us about your business, book a discovery call, or ask about workshops. We respond within 24 hours.",
};

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <section className="py-12 pb-24 sm:py-16 sm:pb-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-16 lg:grid-cols-5 lg:gap-20">
            <div className="lg:col-span-3">
              <ContactForm />
            </div>
            <div className="lg:col-span-2">
              <WhatHappensNext />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
