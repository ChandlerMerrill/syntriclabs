import Hero from "@/components/landing/Hero";
import ServicesOverview from "@/components/landing/ServicesOverview";
import Process from "@/components/landing/Process";
import CTABanner from "@/components/landing/CTABanner";

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <Process />
      <CTABanner />
    </>
  );
}
