interface SectionLabelProps {
  label: string;
  className?: string;
}

export default function SectionLabel({ label, className = "" }: SectionLabelProps) {
  return (
    <span
      className={`inline-block text-xs font-bold uppercase tracking-[0.2em] text-text-accent ${className}`}
    >
      {label}
    </span>
  );
}
