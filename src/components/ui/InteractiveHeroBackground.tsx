"use client";

import { type ReactNode } from "react";
import { motion, useTransform } from "framer-motion";
import { useMousePosition } from "@/hooks/useMousePosition";

interface InteractiveHeroBackgroundProps {
  children: ReactNode;
  blobs: ReactNode;
}

export default function InteractiveHeroBackground({
  children,
  blobs,
}: InteractiveHeroBackgroundProps) {
  const { ref, x, y, rawX, rawY, smoothHovering } = useMousePosition();

  const rotateX = useTransform(() => {
    const el = ref.current;
    if (!el) return 0;
    const h = el.getBoundingClientRect().height;
    const normalizedY = (y.get() / h - 0.5) * 2;
    return normalizedY * -2 * smoothHovering.get();
  });

  const rotateY = useTransform(() => {
    const el = ref.current;
    if (!el) return 0;
    const w = el.getBoundingClientRect().width;
    const normalizedX = (x.get() / w - 0.5) * 2;
    return normalizedX * 2 * smoothHovering.get();
  });

  const highlightMask = useTransform(() => {
    const maskOpacity = smoothHovering.get();
    return `radial-gradient(400px circle at ${rawX.get()}px ${rawY.get()}px, rgba(0,0,0,${maskOpacity}), transparent 70%)`;
  });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-[#fafbff]"
    >
      {/* Tilt container — blobs + base grid + highlight grid */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          perspective: 1200,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {blobs}

        {/* Base grid */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #94A3B850 1px, transparent 1px), linear-gradient(to bottom, #94A3B850 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Highlight grid — masked to cursor */}
        <motion.div
          className="absolute inset-0 opacity-[0.7]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #94A3B870 1px, transparent 1px), linear-gradient(to bottom, #94A3B870 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            WebkitMaskImage: highlightMask,
            maskImage: highlightMask,
          }}
        />
      </motion.div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent" />

      {/* Content */}
      <div className="relative">{children}</div>
    </section>
  );
}
