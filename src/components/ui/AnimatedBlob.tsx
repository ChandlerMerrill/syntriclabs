"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { BlobConfig } from "@/lib/blob-paths";

type BlobVariant = "primary" | "secondary" | "accent";

/**
 * Build radial-gradient color stops for a variant at a given intensity.
 * Primary:   blue (leftward) → violet (rightward)
 * Secondary: violet (leftward) → blue (rightward)
 * Accent:    subtle blue ↔ violet
 */
function getColorStops(variant: BlobVariant, intensity: number) {
  const a = (base: number) => +(base * intensity).toFixed(3);

  switch (variant) {
    case "primary":
      return {
        left: `radial-gradient(circle, rgba(37,99,235,${a(0.35)}) 0%, rgba(96,165,250,${a(0.4)}) 40%, transparent 70%)`,
        mid: `radial-gradient(circle, rgba(79,70,229,${a(0.33)}) 0%, rgba(99,102,241,${a(0.37)}) 40%, transparent 70%)`,
        right: `radial-gradient(circle, rgba(124,58,237,${a(0.3)}) 0%, rgba(139,92,246,${a(0.35)}) 40%, transparent 70%)`,
      };
    case "secondary":
      return {
        left: `radial-gradient(circle, rgba(124,58,237,${a(0.28)}) 0%, rgba(139,92,246,${a(0.32)}) 40%, transparent 70%)`,
        mid: `radial-gradient(circle, rgba(79,70,229,${a(0.28)}) 0%, rgba(99,102,241,${a(0.32)}) 40%, transparent 70%)`,
        right: `radial-gradient(circle, rgba(37,99,235,${a(0.28)}) 0%, rgba(96,165,250,${a(0.35)}) 40%, transparent 70%)`,
      };
    case "accent":
      return {
        left: `radial-gradient(circle, rgba(96,165,250,${a(0.28)}) 0%, rgba(96,165,250,${a(0.01)}) 60%, transparent 70%)`,
        mid: `radial-gradient(circle, rgba(99,102,241,${a(0.26)}) 0%, rgba(99,102,241,${a(0.01)}) 60%, transparent 70%)`,
        right: `radial-gradient(circle, rgba(139,92,246,${a(0.26)}) 0%, rgba(139,92,246,${a(0.01)}) 60%, transparent 70%)`,
      };
  }
}

interface AnimatedBlobProps {
  config: BlobConfig;
  variant: BlobVariant;
  className: string;
  /** Multiplier for color opacity — default 1, use >1 for darker blobs */
  intensity?: number;
}

export default function AnimatedBlob({
  config,
  variant,
  className,
  intensity = 1,
}: AnimatedBlobProps) {
  const x = useMotionValue(config.x.values[0]);
  const y = useMotionValue(config.y.values[0]);
  const scale = useMotionValue(config.scale.values[0]);

  useEffect(() => {
    const xAnim = animate(x, config.x.values, {
      duration: config.x.duration,
      repeat: Infinity,
      ease: "easeInOut",
    });
    const yAnim = animate(y, config.y.values, {
      duration: config.y.duration,
      repeat: Infinity,
      ease: "easeInOut",
    });
    const scaleAnim = animate(scale, config.scale.values, {
      duration: config.scale.duration,
      repeat: Infinity,
      ease: "easeInOut",
    });

    return () => {
      xAnim.stop();
      yAnim.stop();
      scaleAnim.stop();
    };
  }, [x, y, scale, config]);

  const colors = getColorStops(variant, intensity);
  const xMin = Math.min(...config.x.values);
  const xMax = Math.max(...config.x.values);
  const xMid = (xMin + xMax) / 2;

  const background = useTransform(
    x,
    [xMin, xMid, xMax],
    [colors.left, colors.mid, colors.right],
  );

  return (
    <motion.div className={className} style={{ x, y, scale, background }} />
  );
}
