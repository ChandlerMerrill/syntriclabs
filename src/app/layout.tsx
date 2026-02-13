import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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

export const metadata: Metadata = {
  title: {
    default: "Syntric Labs | AI Solutions That Deliver ROI",
    template: "%s | Syntric Labs",
  },
  description:
    "Syntric Labs builds practical AI automation systems, agents, and workflows that plug into your business operations and deliver measurable ROI.",
  metadataBase: new URL("https://syntriclabs.com"),
  openGraph: {
    title: "Syntric Labs | AI Solutions That Deliver ROI",
    description:
      "We build practical AI automation systems — agents, workflows, and integrations — that deliver measurable results.",
    url: "https://syntriclabs.com",
    siteName: "Syntric Labs",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Syntric Labs | AI Solutions That Deliver ROI",
    description:
      "We build practical AI automation systems — agents, workflows, and integrations — that deliver measurable results.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Organization structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Syntric Labs",
  url: "https://syntriclabs.com",
  description:
    "Syntric Labs builds practical AI automation systems, agents, and workflows for businesses.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "chandler@syntriclabs.com",
    contactType: "sales",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <main className="min-h-screen pt-[72px]">{children}</main>
        <Footer />
        <RelevanceAIWidget />
      </body>
    </html>
  );
}
