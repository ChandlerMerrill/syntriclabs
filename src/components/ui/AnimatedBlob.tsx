interface AnimatedBlobProps {
  /** Blob diameter in px */
  size: number;
  /** Blur radius in px — applied once as a static filter, never re-evaluated */
  blur: number;
  /** Color intensity multiplier (default 1) */
  intensity?: number;
  /** Which float keyframe to use (1-4) */
  variant?: 1 | 2 | 3 | 4;
  /** Float animation duration in seconds (default 20) */
  duration?: number;
  /** Burst cycle duration in seconds — lower = faster firework pace (default 6) */
  burstDuration?: number;
  /** CSS animation-delay in seconds (default 0) */
  delay?: number;
  /** Position as % from left/top */
  position: { left: number; top: number };
  /** Hide on screens < 768px */
  hideOnMobile?: boolean;
  /** Gradient preset: blue | indigo | violet */
  color?: "blue" | "indigo" | "violet";
}

const gradients: Record<string, (intensity: number) => string> = {
  blue: (i) =>
    `radial-gradient(circle, rgba(37,99,235,${(0.35 * i).toFixed(3)}) 0%, rgba(96,165,250,${(0.4 * i).toFixed(3)}) 40%, transparent 70%)`,
  indigo: (i) =>
    `radial-gradient(circle, rgba(79,70,229,${(0.35 * i).toFixed(3)}) 0%, rgba(99,102,241,${(0.4 * i).toFixed(3)}) 40%, transparent 70%)`,
  violet: (i) =>
    `radial-gradient(circle, rgba(124,58,237,${(0.35 * i).toFixed(3)}) 0%, rgba(139,92,246,${(0.4 * i).toFixed(3)}) 40%, transparent 70%)`,
};

const burstVariants = [1, 2, 3] as const;

export default function AnimatedBlob({
  size,
  blur,
  intensity = 1,
  variant = 1,
  duration = 20,
  burstDuration = 6,
  delay = 0,
  position,
  hideOnMobile = false,
  color = "blue",
}: AnimatedBlobProps) {
  // Pick a burst variant based on the float variant so they don't all sync
  const burst = burstVariants[(variant - 1) % burstVariants.length];

  return (
    <div
      className={`hero-blob absolute rounded-full will-change-[transform,opacity]${hideOnMobile ? " hidden md:block" : ""}`}
      style={{
        left: `${position.left}%`,
        top: `${position.top}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        filter: `blur(${blur}px)`,
        background: gradients[color](intensity),
        opacity: 0,
        animation: `blob-float-${variant} ${duration}s ease-in-out ${delay}s infinite, blob-burst-${burst} ${burstDuration}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}
