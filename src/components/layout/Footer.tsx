import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-200/60 bg-off-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-white">S</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-near-black">
                Syntric Labs
              </span>
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
                className="text-sm font-medium text-gray-500 transition-colors hover:text-near-black"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200/60 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Syntric Labs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
