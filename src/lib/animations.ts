import type { Variants, Transition } from "framer-motion";

/* ── Easing ── */
const expoOut = [0.16, 1, 0.3, 1] as const;

/* ── Fade-up (the default entrance) ── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 48 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: expoOut },
  },
};

/* ── Pop-in (scale + y + opacity) ── */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 14 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: expoOut },
  },
};

/* ── Stagger containers ── */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export const staggerFast: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const staggerSlow: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
};

/* ── Spring hover (reusable whileHover config) ── */
export const springHover = {
  y: -6,
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

/* ── Clip-path reveal (hero H1s) ── */
export const clipReveal: Variants = {
  hidden: { clipPath: "inset(100% 0 0 0)" },
  show: {
    clipPath: "inset(0% 0 0 0)",
    transition: { duration: 1.0, ease: expoOut },
  },
};

/* ── Line reveal (gradient dividers) ── */
export const lineReveal: Variants = {
  hidden: { scaleX: 0 },
  show: {
    scaleX: 1,
    transition: { duration: 1.2, ease: expoOut },
  },
};

/* ── Orchestrated entrance with custom delay ── */
export function entranceTransition(delay = 0): Transition {
  return { duration: 0.8, delay, ease: expoOut };
}
