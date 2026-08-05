"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface FloatingIslandProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Whether the island fades back out as it scrolls past. Fine mid-page, wrong
   * for a section that ends the page: the footer pushes it far enough through
   * its scroll range that it dims while still fully on screen. Terminal CTAs
   * pass false so they stay legible where the reader actually stops.
   */
  fadeOut?: boolean;
}

export default function FloatingIsland({
  children,
  className = "",
  fadeOut = true,
}: FloatingIslandProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawScale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    fadeOut ? [0.95, 1, 1, 0.97] : [0.95, 1, 1, 1],
  );
  const rawOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.7, 1],
    fadeOut ? [0, 1, 1, 0] : [0, 1, 1, 1],
  );
  const rawY = useTransform(scrollYProgress, [0.7, 1], fadeOut ? [0, -60] : [0, 0]);

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
