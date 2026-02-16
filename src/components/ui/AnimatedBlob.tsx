"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedBlobProps {
  size: number;
  blur: number;
  intensity?: number;
  initialDelay?: number;
  startVisible?: boolean;
  initialPosition?: { left: number; top: number };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Maps a horizontal position (0-100%) to a radial gradient.
 * Left = blue, center = indigo, right = violet.
 */
function getGradientForPosition(leftPercent: number, intensity: number) {
  const t = Math.max(0, Math.min(1, leftPercent / 100));
  const a = (base: number) => +(base * intensity).toFixed(3);

  // Blue-600 → Indigo-600 → Violet-600 (core)
  // Blue-400 → Indigo-400 → Violet-400 (edge)
  let coreR: number, coreG: number, coreB: number;
  let edgeR: number, edgeG: number, edgeB: number;

  if (t <= 0.5) {
    const s = t / 0.5;
    coreR = lerp(37, 79, s);
    coreG = lerp(99, 70, s);
    coreB = lerp(235, 229, s);
    edgeR = lerp(96, 99, s);
    edgeG = lerp(165, 102, s);
    edgeB = lerp(250, 241, s);
  } else {
    const s = (t - 0.5) / 0.5;
    coreR = lerp(79, 124, s);
    coreG = lerp(70, 58, s);
    coreB = lerp(229, 237, s);
    edgeR = lerp(99, 139, s);
    edgeG = lerp(102, 92, s);
    edgeB = lerp(241, 246, s);
  }

  const cr = Math.round(coreR);
  const cg = Math.round(coreG);
  const cb = Math.round(coreB);
  const er = Math.round(edgeR);
  const eg = Math.round(edgeG);
  const eb = Math.round(edgeB);

  return `radial-gradient(circle, rgba(${cr},${cg},${cb},${a(0.35)}) 0%, rgba(${er},${eg},${eb},${a(0.4)}) 40%, transparent 70%)`;
}

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function AnimatedBlob({
  size,
  blur,
  intensity = 1,
  initialDelay = 0,
  startVisible = false,
  initialPosition,
}: AnimatedBlobProps) {
  const [position, setPosition] = useState({
    left: initialPosition?.left ?? randomInRange(10, 90),
    top: initialPosition?.top ?? randomInRange(10, 90),
  });

  const opacity = useMotionValue(startVisible ? 1 : 0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const positionLeft = useMotionValue(position.left);

  const background = useTransform([x, positionLeft], ([xVal, leftVal]) => {
    const driftPercent = (xVal as number) / 12;
    return getGradientForPosition((leftVal as number) + driftPercent, intensity);
  });

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<{ stop: () => void }> = [];

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const sleep = (s: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, s * 1000);
        cleanups.push({ stop: () => clearTimeout(id) });
      });

    const runCycle = async (isFirst: boolean) => {
      if (cancelled) return;

      // 1. Pick position (initial or random)
      const newLeft =
        isFirst && initialPosition
          ? initialPosition.left
          : randomInRange(10, 90);
      const newTop =
        isFirst && initialPosition
          ? initialPosition.top
          : randomInRange(10, 90);

      positionLeft.set(newLeft);
      setPosition({ left: newLeft, top: newTop });

      if (cancelled) return;

      // 2. Wait — initial delay on first cycle (unless startVisible), pause on later cycles
      if (isFirst && !startVisible && initialDelay > 0) {
        await sleep(initialDelay);
      } else if (!isFirst) {
        await sleep(randomInRange(0.38, 0.8));
      }

      if (cancelled) return;

      // 3. Fade in (skip if startVisible on first cycle — already visible)
      if (!(isFirst && startVisible)) {
        if (prefersReducedMotion) {
          opacity.jump(1);
        } else {
          const fadeIn = animate(opacity, 1, {
            duration: 0.65,
            ease: "easeInOut",
          });
          cleanups.push(fadeIn);
          await fadeIn;
        }
      }

      if (cancelled) return;

      // 4. Drift
      if (!prefersReducedMotion) {
        const driftDuration = randomInRange(4, 6.5);
        const driftX = animate(x, randomInRange(-30, 30), {
          duration: driftDuration,
          ease: "easeInOut",
        });
        const driftY = animate(y, randomInRange(-30, 30), {
          duration: driftDuration,
          ease: "easeInOut",
        });
        const driftScale = animate(scale, randomInRange(0.97, 1.04), {
          duration: driftDuration,
          ease: "easeInOut",
        });
        cleanups.push(driftX, driftY, driftScale);
        await Promise.all([driftX, driftY, driftScale]);
      } else {
        await sleep(randomInRange(3.2, 5.2));
      }

      if (cancelled) return;

      // 5. Fade out
      if (prefersReducedMotion) {
        opacity.jump(0);
      } else {
        const fadeOut = animate(opacity, 0, {
          duration: 0.65,
          ease: "easeInOut",
        });
        cleanups.push(fadeOut);
        await fadeOut;
      }

      if (cancelled) return;

      // 6. Reset transforms
      x.jump(0);
      y.jump(0);
      scale.jump(1);
    };

    const loop = async () => {
      let isFirst = true;
      while (!cancelled) {
        await runCycle(isFirst);
        isFirst = false;
      }
    };

    loop();

    return () => {
      cancelled = true;
      cleanups.forEach((c) => c.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      style={{
        position: "absolute",
        left: `${position.left}%`,
        top: `${position.top}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "9999px",
        filter: `blur(${blur}px)`,
        opacity,
        x,
        y,
        scale,
        background,
      }}
    />
  );
}
