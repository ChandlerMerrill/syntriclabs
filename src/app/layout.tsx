import type { Metadata } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CursorGlow from "@/components/ui/CursorGlow";
import RelevanceAIWidget from "@/components/ui/RelevanceAIWidget";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  weight: ["600", "700"],
  variable: "--font-rajdhani",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Syntric Labs — Custom Software for Small Business",
    template: "%s — Syntric Labs",
  },
  description:
    "Custom software and automation for SMBs hitting operational ceilings. Full platforms built in weeks, not months. Book a free discovery call.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable}`}
    >
      <body className="grain-overlay min-h-screen">
        <Navbar />
        <CursorGlow />
        <main>{children}</main>
        <Footer />
        <RelevanceAIWidget />
      </body>
    </html>
  );
}
