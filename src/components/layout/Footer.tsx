import Link from "next/link";
import Image from "next/image";
import { Linkedin } from "lucide-react";
import GradientDivider from "@/components/ui/GradientDivider";

const siteLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-bg-primary">
      {/* Curve Line SVG — decorative, fills entire footer */}
      <img
        src="/svg/Curve Line.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full svg-breathe opacity-40"
      />

      <GradientDivider />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white/90 p-0.5">
                <Image
                  src="/images/updated-logo.png"
                  alt="Syntric"
                  width={68}
                  height={106}
                  className="h-[4rem] w-auto"
                />
              </div>
              <span className="rounded-full border border-border bg-bg-secondary/80 px-5 py-2.5 font-[family-name:var(--font-rajdhani)] text-3xl font-bold text-text-primary backdrop-blur-md">
                Syntric
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              Custom software. Built fast. Built right.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
                Pages
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {siteLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
                Connect
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                <li>
                  <a
                    href="https://www.linkedin.com/in/chandler-merrill-b11457117/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="font-[family-name:var(--font-rajdhani)] text-xl font-bold tracking-tight gradient-text sm:text-2xl">
            We align. You accelerate.
          </p>
          <p className="mt-3 text-xs text-text-secondary">
            &copy; {new Date().getFullYear()} Syntric Labs. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
