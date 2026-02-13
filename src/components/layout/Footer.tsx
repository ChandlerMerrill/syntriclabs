import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-200/40 bg-[#fafbff]">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          <div>
            <Link href="/" className="flex items-center">
              <Image
                src="/images/syntric-logo-nob5.png"
                alt="Syntric Labs"
                width={1000}
                height={340}
                className="h-12 w-auto"
              />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              AI solutions that deliver measurable ROI. We build practical
              automation for real business operations.
            </p>
          </div>

          <div className="flex items-center gap-8">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-near-black"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://www.linkedin.com/in/chandler-merrill-b11457117/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 transition-colors duration-200 hover:text-near-black"
              aria-label="LinkedIn"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200/40 pt-10 text-center">
          <p className="text-xl font-extrabold uppercase tracking-[0.25em] text-near-black sm:text-2xl">
            We <span className="italic">align.</span>{" "}
            <span className="shimmer-text">You <span className="italic">accelerate.</span></span>
          </p>
          <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-primary to-violet-500" />
          <p className="mt-5 text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Syntric Labs. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
