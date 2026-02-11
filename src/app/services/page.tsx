import type { Metadata } from "next";
import ServicesContent from "./ServicesContent";

export const metadata: Metadata = {
  title: "Services & Demos",
  description:
    "Explore live demos of our AI chat and voice agents. See how Syntric Labs automates customer interactions in real time.",
};

export default function ServicesPage() {
  return <ServicesContent />;
}
