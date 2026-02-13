"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function CursorGlow() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawHovering = useMotionValue(0);

  const smoothHovering = useSpring(rawHovering, {
    stiffness: 400,
    damping: 35,
  });

  const background = useTransform(() => {
    const opacity = 0.35 * smoothHovering.get();
    return `radial-gradient(250px circle at ${rawX.get()}px ${rawY.get()}px, rgba(37,99,235,${opacity}), transparent 40%)`;
  });

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const handleMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };

    const handleEnter = () => rawHovering.set(1);
    const handleLeave = () => rawHovering.set(0);

    main.addEventListener("mousemove", handleMove);
    main.addEventListener("mouseenter", handleEnter);
    main.addEventListener("mouseleave", handleLeave);

    return () => {
      main.removeEventListener("mousemove", handleMove);
      main.removeEventListener("mouseenter", handleEnter);
      main.removeEventListener("mouseleave", handleLeave);
    };
  }, [rawX, rawY, rawHovering]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-10"
      style={{ background }}
    />
  );
}
