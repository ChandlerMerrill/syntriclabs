import AnimateIn from "./AnimateIn";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export default function SectionHeader({
  title,
  subtitle,
  centered = true,
}: SectionHeaderProps) {
  return (
    <AnimateIn className={`mb-14 ${centered ? "text-center" : ""}`}>
      <h2 className="text-3xl font-extrabold tracking-tight text-near-black sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-gray-500 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </AnimateIn>
  );
}
