import type { Metadata } from "next";
import ContactContent from "./ContactContent";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Syntric Labs. Tell us about your project and we'll respond within 24 hours.",
};

export default function ContactPage() {
  return <ContactContent />;
}
