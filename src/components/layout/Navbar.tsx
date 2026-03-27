"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const pillShadow = (scrolled: boolean) =>
  scrolled
    ? "shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
    : "shadow-[0_2px_12px_rgba(0,0,0,0.10)]";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY <= 0) {
        setHidden(false);
      } else {
        setHidden(currentY > lastScrollY.current && currentY > 100);
      }
      setScrolled(currentY > 40);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <motion.div
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.38, ease: [0.25, 1, 0.5, 1] }}
      >
        {/* ── Desktop: three floating pills ── */}
        <div className="hidden md:flex items-center justify-between max-w-[1200px] mx-auto px-4 pt-4 pointer-events-auto gap-3">
          {/* 1. Logo pill */}
          <Link
            href="/"
            className={`flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full pl-2 pr-4 py-1.5 transition-shadow duration-300 ${pillShadow(scrolled)}`}
          >
            <Image
              src="/images/updated-logo.png"
              alt="Syntric Labs"
              width={358}
              height={554}
              className="h-[44px] w-auto"
              priority
            />
            <span className="font-[family-name:var(--font-rajdhani)] text-[20px] font-bold tracking-tight text-near-black">
              Syntric
            </span>
          </Link>

          {/* 2. Nav links pill */}
          <nav
            className={`bg-white/95 backdrop-blur-sm rounded-full px-2 py-1.5 flex items-center gap-0.5 transition-shadow duration-300 ${pillShadow(scrolled)}`}
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-medium text-sm px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
                  isActive(pathname, link.href)
                    ? "bg-neutral-800/90 text-white/95"
                    : "text-gray-500 hover:text-near-black hover:bg-gray-50"
                }`}
                style={
                  isActive(pathname, link.href)
                    ? {
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.12)",
                      }
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 3. CTA pill */}
          <motion.div
            className="rounded-full"
            whileHover={{ scale: 1.04, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 } as object}
          >
            <Link
              href="/contact"
              className="flex items-center gap-2 bg-neutral-900 text-white font-bold px-5 py-2.5 rounded-full text-sm whitespace-nowrap"
              style={{
                boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
                outline: "2px solid rgba(255,255,255,0.6)",
                outlineOffset: "-1px",
              }}
            >
              Get in touch
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>

        {/* ── Mobile: logo + hamburger ── */}
        <div className="flex md:hidden items-center justify-between px-3 pt-3 pointer-events-auto">
          <Link
            href="/"
            className={`flex items-center gap-1 bg-white rounded-full pl-1.5 pr-3 py-1 transition-shadow duration-300 ${pillShadow(scrolled)}`}
          >
            <Image
              src="/images/updated-logo.png"
              alt="Syntric Labs"
              width={358}
              height={554}
              className="h-[36px] w-auto"
              priority
            />
            <span className="font-[family-name:var(--font-rajdhani)] text-[18px] font-bold tracking-tight text-near-black">
              Syntric
            </span>
          </Link>

          <button
            className={`bg-white rounded-full px-4 py-3 flex flex-col gap-1.5 transition-shadow duration-300 ${pillShadow(scrolled)}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            <motion.span
              className="block w-5 h-0.5 bg-neutral-900 rounded-full"
              animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 8 : 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="block w-5 h-0.5 bg-neutral-900 rounded-full"
              animate={{ opacity: mobileOpen ? 0 : 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="block w-5 h-0.5 bg-neutral-900 rounded-full"
              animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -8 : 0 }}
              transition={{ duration: 0.2 }}
            />
          </button>
        </div>

        {/* ── Mobile menu card ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="md:hidden mx-3 mt-2 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] overflow-hidden pointer-events-auto"
            >
              <div className="px-4 py-4 flex flex-col gap-0.5">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block font-medium py-2.5 px-3 rounded-xl transition-all duration-200 text-sm ${
                      isActive(pathname, link.href)
                        ? "bg-neutral-800/90 text-white/95"
                        : "text-gray-600 hover:text-near-black hover:bg-gray-50"
                    }`}
                    style={
                      isActive(pathname, link.href)
                        ? {
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.1)",
                          }
                        : undefined
                    }
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="mt-2 pt-3 border-t border-gray-100">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Link
                      href="/contact"
                      className="flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3 rounded-xl text-sm"
                      onClick={() => setMobileOpen(false)}
                    >
                      Get in touch
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
