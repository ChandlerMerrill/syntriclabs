interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  hover = true,
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm ${hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
