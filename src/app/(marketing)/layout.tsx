import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CursorGlow from "@/components/ui/CursorGlow";
import ChatWidget from "@/components/widget/ChatWidget";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grain-overlay">
      <Navbar />
      <CursorGlow />
      <main>{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
