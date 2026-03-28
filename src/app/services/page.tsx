import type { Metadata } from "next";
import ServicesHero from "@/components/services/ServicesHero";
import CustomSoftware from "@/components/services/CustomSoftware";
import VoiceDemo from "@/components/services/VoiceDemo";
import ChatDemo from "@/components/services/ChatDemo";
import Workshops from "@/components/services/Workshops";
import ServicesCTA from "@/components/services/ServicesCTA";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Custom software, AI agents, and hands-on training for small businesses. Voice and chat demos you can try live. Book a discovery call.",
};

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      <CustomSoftware />
      <VoiceDemo />
      <ChatDemo />
      <Workshops />
      <ServicesCTA />
    </>
  );
}
