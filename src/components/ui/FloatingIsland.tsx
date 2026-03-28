"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface FloatingIslandProps {
  children: React.ReactNode;
  className?: string;
}

export default function FloatingIsland({ children, className = "" }: FloatingIslandProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawScale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.95, 1, 1, 0.97]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.15, 0.7, 1], [0, 1, 1, 0]);
  const rawY = useTransform(scrollYProgress, [0.7, 1], [0, -60]);

  const springConfig = { stiffness: 120, damping: 30 };
  const scale = useSpring(rawScale, springConfig);
  const opacity = useSpring(rawOpacity, springConfig);
  const y = useSpring(rawY, springConfig);

  return (
    <motion.div
      ref={ref}
      style={{ scale, opacity, y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
