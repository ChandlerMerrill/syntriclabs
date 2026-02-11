import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-light shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5",
  secondary:
    "bg-white text-gray-700 border border-gray-200 hover:border-gray-200 hover:bg-gray-50 hover:text-near-black shadow-sm hover:shadow-md hover:-translate-y-0.5",
  outline:
    "border border-primary/30 text-primary bg-primary-bg/50 hover:bg-primary hover:text-white hover:border-primary hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 cursor-pointer";
  const styles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? "opacity-50 cursor-not-allowed !translate-y-0 !shadow-none" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={styles}
    >
      {children}
    </button>
  );
}
