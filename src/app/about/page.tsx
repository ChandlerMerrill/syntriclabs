import type { Metadata } from "next";
import AboutHero from "@/components/about/AboutHero";
import Values from "@/components/about/Values";
import FounderBio from "@/components/about/FounderBio";

export const metadata: Metadata = {
  title: "About",
  description:
    "Syntric Labs is a one-person software studio that builds custom platforms for small businesses. Meet the founder and learn how we work.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <Values />
      <FounderBio />
    </>
  );
}
