"use client";

import { motion } from "framer-motion";
import { lineReveal } from "@/lib/animations";

interface GradientDividerProps {
  className?: string;
}

export default function GradientDivider({ className = "" }: GradientDividerProps) {
  return (
    <motion.div
      className={`gradient-line w-full origin-center ${className}`}
      variants={lineReveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    />
  );
}
