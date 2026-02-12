"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] border-b border-gray-200/40"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/syntric-logo-nob.png"
            alt="Syntric Labs"
            width={1000}
            height={340}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                pathname === link.href
                  ? "text-primary"
                  : "text-gray-500 hover:text-near-black hover:bg-gray-50/80"
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute bottom-0.5 left-3.5 right-3.5 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
          <div className="ml-5">
            <Button href="/contact" size="sm">
              Get in touch
            </Button>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-50 md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`absolute block h-0.5 w-5 bg-near-black transition-all duration-300 ${mobileOpen ? "translate-y-0 rotate-45" : "-translate-y-1.5"}`}
          />
          <span
            className={`absolute block h-0.5 w-5 bg-near-black transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`absolute block h-0.5 w-5 bg-near-black transition-all duration-300 ${mobileOpen ? "translate-y-0 -rotate-45" : "translate-y-1.5"}`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-gray-100/80 bg-white/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0 border-t-0"
        }`}
      >
        <div className="px-6 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-primary-bg text-primary"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 px-3">
            <Button href="/contact" size="sm" className="w-full">
              Get in touch
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
