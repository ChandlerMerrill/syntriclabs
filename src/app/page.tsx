import Hero from "@/components/landing/Hero";
import ServicesOverview from "@/components/landing/ServicesOverview";
import CaseStudy from "@/components/landing/CaseStudy";
import Portfolio from "@/components/landing/Portfolio";
import CTABanner from "@/components/landing/CTABanner";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <CaseStudy />
      <Portfolio />
      <CTABanner />
    </>
  );
}
