"use client";

import { motion } from "framer-motion";

type AnimateInVariant = "fadeUp" | "popIn" | "fadeLeft" | "fadeRight";

interface AnimateInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  variant?: AnimateInVariant;
  stagger?: number;
}

const directionOffset = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
};

const easing = [0.16, 1, 0.3, 1] as const;

export default function AnimateIn({
  children,
  delay = 0,
  className = "",
  direction = "up",
  variant = "fadeUp",
  stagger,
}: AnimateInProps) {
  if (variant === "popIn") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay, ease: easing }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  if (variant === "fadeLeft") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay, ease: easing }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  if (variant === "fadeRight") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay, ease: easing }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  const offset = directionOffset[direction];

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay,
        ease: easing,
        ...(stagger !== undefined && {
          staggerChildren: stagger,
        }),
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
