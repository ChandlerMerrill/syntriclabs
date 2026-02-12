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
                src="/images/syntric-logo-nob.png"
                alt="Syntric Labs"
                width={1000}
                height={340}
                className="h-15 w-auto"
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
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200/40 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Syntric Labs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
