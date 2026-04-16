"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setIsAdmin(!!user));
  }, []);

  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      setHidden(y > 100 && y > lastY);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 right-0 left-0 z-50"
    >
      <nav
        className={`mx-auto flex max-w-7xl items-center justify-between px-4 py-4 transition-all duration-300 sm:px-6 ${
          scrolled ? "py-3" : "py-4"
        }`}
      >
        {/* Logo + text pill */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white/90 p-0.5">
            <Image
              src="/images/updated-logo.png"
              alt="Syntric"
              width={68}
              height={106}
              className="h-[4rem] w-auto"
            />
          </div>
          <span className="rounded-full border border-border bg-bg-secondary/80 px-4 py-2 font-[family-name:var(--font-rajdhani)] text-lg font-bold text-text-primary backdrop-blur-md">
            Syntric
          </span>
        </Link>

        {/* Nav links pill — desktop */}
        <div className="hidden rounded-full border border-border bg-bg-secondary px-1 py-1 backdrop-blur-md md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop right cluster: Admin pill (if signed in) + CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary/80 px-4 py-2 text-sm font-medium text-text-secondary backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:text-text-primary"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
          <Link
            href="/contact"
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 backdrop-blur-md transition-all duration-200 hover:bg-primary-light hover:shadow-primary/40 btn-shimmer"
          >
            Get in Touch
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-secondary/80 backdrop-blur-md md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-4 w-4 text-text-primary" />
          ) : (
            <Menu className="h-4 w-4 text-text-primary" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-4 overflow-hidden rounded-2xl border border-border bg-bg-secondary/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1 p-3">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-bg-tertiary text-text-primary"
                        : "text-text-secondary hover:bg-bg-tertiary/50 hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary/50 hover:text-text-primary"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <Link
                href="/contact"
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === "/contact"
                    ? "bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:bg-bg-tertiary/50 hover:text-text-primary"
                }`}
              >
                Contact
              </Link>
              <div className="gradient-line my-2" />
              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white"
              >
                Get in Touch
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
