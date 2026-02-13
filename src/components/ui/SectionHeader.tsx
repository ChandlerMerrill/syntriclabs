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
      <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-primary-lighter mx-auto" />
      {subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-gray-600 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </AnimateIn>
  );
}
