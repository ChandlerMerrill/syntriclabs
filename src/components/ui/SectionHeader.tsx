import AnimateIn from "./AnimateIn";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  label?: string;
  centered?: boolean;
}

export default function SectionHeader({
  title,
  subtitle,
  label,
  centered = true,
}: SectionHeaderProps) {
  return (
    <AnimateIn className={`mb-16 ${centered ? "text-center" : ""}`}>
      {label && (
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          {label}
        </p>
      )}
      <h2 className="text-3xl font-extrabold tracking-tight text-near-black sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-lg leading-relaxed text-gray-500 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </AnimateIn>
  );
}
