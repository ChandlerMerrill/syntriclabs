"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-light shadow-lg shadow-primary/20 hover:shadow-primary/30",
  secondary:
    "bg-bg-secondary text-text-primary border border-border hover:border-border-hover hover:bg-bg-tertiary",
  outline:
    "bg-bg-secondary text-text-primary border border-border hover:border-primary hover:text-primary-lighter",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3 text-base",
};

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  external,
  type = "button",
  disabled,
  onClick,
  className = "",
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${variant === "primary" ? "animate-[pulse-glow_3s_ease-in-out_infinite] btn-shimmer" : ""} ${className}`;

  if (href && external) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        whileHover={disabled ? undefined : { y: -2 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={springTransition}
      >
        {children}
      </motion.a>
    );
  }

  if (href) {
    return (
      <motion.div
        whileHover={disabled ? undefined : { y: -2 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={springTransition}
        className="inline-block"
      >
        <Link href={href} className={classes}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={springTransition}
    >
      {children}
    </motion.button>
  );
}
