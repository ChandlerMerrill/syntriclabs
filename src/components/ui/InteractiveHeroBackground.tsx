"use client";

import { type ReactNode } from "react";
import { motion, useTransform } from "framer-motion";
import { useMousePosition } from "@/hooks/useMousePosition";
import { useIsMobile } from "@/hooks/useIsMobile";

interface InteractiveHeroBackgroundProps {
  children: ReactNode;
}

export default function InteractiveHeroBackground({
  children,
}: InteractiveHeroBackgroundProps) {
  const isMobile = useIsMobile();
  const { ref, x, y, rawX, rawY, smoothHovering } = useMousePosition();

  const rotateX = useTransform(() => {
    if (isMobile) return 0;
    const el = ref.current;
    if (!el) return 0;
    const h = el.getBoundingClientRect().height;
    const normalizedY = (y.get() / h - 0.5) * 2;
    return normalizedY * -2 * smoothHovering.get();
  });

  const rotateY = useTransform(() => {
    if (isMobile) return 0;
    const el = ref.current;
    if (!el) return 0;
    const w = el.getBoundingClientRect().width;
    const normalizedX = (x.get() / w - 0.5) * 2;
    return normalizedX * 2 * smoothHovering.get();
  });

  const highlightMask = useTransform(() => {
    if (isMobile) return "none";
    const maskOpacity = smoothHovering.get();
    return `radial-gradient(400px circle at ${rawX.get()}px ${rawY.get()}px, rgba(0,0,0,${maskOpacity}), transparent 70%)`;
  });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden"
    >
      {!isMobile && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            perspective: 1200,
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
        />
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg-primary to-transparent" />

      <div className="relative">{children}</div>
    </section>
  );
}
