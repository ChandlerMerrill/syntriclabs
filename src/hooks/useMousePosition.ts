"use client";

import { useRef, useEffect } from "react";
import {
  useMotionValue,
  useSpring,
  type MotionValue,
} from "framer-motion";

interface UseMousePositionReturn {
  ref: React.RefObject<HTMLElement | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  rawX: MotionValue<number>;
  rawY: MotionValue<number>;
  smoothHovering: MotionValue<number>;
}

const springConfig = { stiffness: 1000, damping: 60, mass: 0.1 };

export function useMousePosition(): UseMousePositionReturn {
  const ref = useRef<HTMLElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawHovering = useMotionValue(0);

  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);
  const smoothHovering = useSpring(rawHovering, {
    stiffness: 400,
    damping: 35,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      rawX.set(e.clientX - rect.left);
      rawY.set(e.clientY - rect.top);
    };

    const handleEnter = () => {
      rawHovering.set(1);
    };

    const handleLeave = () => {
      rawHovering.set(0);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseenter", handleEnter);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [rawX, rawY, rawHovering]);

  return { ref, x, y, rawX, rawY, smoothHovering };
}
