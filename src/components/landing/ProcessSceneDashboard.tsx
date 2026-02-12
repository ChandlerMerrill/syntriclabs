"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

const metrics = [
  { label: "Response Time", from: "2.3s", to: "0.4s", value: 0.4, unit: "s", direction: "down" as const },
  { label: "Leads Captured", from: "", to: "+147%", value: 147, unit: "%", direction: "up" as const },
  { label: "Manual Tasks", from: "6hrs", to: "45min", value: 45, unit: "min", direction: "down" as const },
];

const bars = [
  { day: "Mon", height: 45 },
  { day: "Tue", height: 62 },
  { day: "Wed", height: 78 },
  { day: "Thu", height: 58 },
  { day: "Fri", height: 90 },
];

function useCountUp(target: number, duration: number, delay: number, active: boolean) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }

    const start = performance.now();
    const delayMs = delay * 1000;

    function tick(now: number) {
      const elapsed = now - start - delayMs;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, delay, active]);

  return count;
}

export default function ProcessSceneDashboard() {
  const reducedMotion = useReducedMotion();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger animation on mount (when scene becomes active)
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const responseTime = useCountUp(4, 1.2, 0.2, animate && !reducedMotion);
  const leadsCaptured = useCountUp(147, 1.2, 0.4, animate && !reducedMotion);
  const manualTasks = useCountUp(45, 1.2, 0.6, animate && !reducedMotion);

  const countValues = [
    `0.${responseTime}`,
    `+${leadsCaptured}`,
    `${manualTasks}`,
  ];
  const countUnits = ["s", "%", "min"];

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-near-black">Results Dashboard</h4>
          <p className="text-xs text-gray-400">30-day performance snapshot</p>
        </div>
        <div className="ml-auto flex h-2 w-2 rounded-full bg-emerald-500" />
      </div>

      <div className="mb-5 h-px bg-gray-100" />

      {/* Metric cards */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: reducedMotion ? 0 : 0.1 + i * 0.15,
            }}
            className="rounded-xl bg-gray-50/80 px-3 py-3 text-center"
          >
            <p className="text-xs font-medium text-gray-400 mb-1">{m.label}</p>
            <p className="text-lg font-bold text-near-black tabular-nums">
              {reducedMotion ? m.to : `${countValues[i]}${countUnits[i]}`}
            </p>
            {m.from && (
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="line-through">{m.from}</span>
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div className="rounded-xl bg-gray-50/80 p-4">
        <p className="mb-3 text-xs font-medium text-gray-400">AI Conversations This Week</p>
        <div className="flex items-end justify-between gap-2" style={{ height: 80 }}>
          {bars.map((bar, i) => (
            <div key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                initial={reducedMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                  delay: reducedMotion ? 0 : 0.5 + i * 0.08,
                }}
                className="w-full origin-bottom rounded-t-md bg-emerald-400"
                style={{ height: `${bar.height}%` }}
              />
              <span className="text-[10px] font-medium text-gray-400">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
