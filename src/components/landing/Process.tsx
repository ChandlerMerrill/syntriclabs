"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import SectionHeader from "@/components/ui/SectionHeader";
import ProcessStepSelector, { steps } from "./ProcessStepSelector";
import ProcessVisualPanel from "./ProcessVisualPanel";

const TICK_MS = 70;
const TOTAL_TICKS = 100; // 100 ticks × 70ms = 7s

export default function Process() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  const tickRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % steps.length);
    tickRef.current = 0;
    setProgress(0);
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const pct = (tickRef.current / TOTAL_TICKS) * 100;
      setProgress(pct);
      if (tickRef.current >= TOTAL_TICKS) {
        advance();
      }
    }, TICK_MS);
  }, [clearTimer, advance]);

  // Start/stop based on paused state
  useEffect(() => {
    if (paused || reducedMotion) {
      clearTimer();
    } else {
      startTimer();
    }
    return clearTimer;
  }, [paused, reducedMotion, startTimer, clearTimer]);

  const handleSelectStep = useCallback(
    (index: number) => {
      setActiveStep(index);
      tickRef.current = 0;
      setProgress(0);
      // Restart timer if not paused
      if (!paused && !reducedMotion) {
        startTimer();
      }
    },
    [paused, reducedMotion, startTimer]
  );

  const handleHover = useCallback((hovering: boolean) => {
    setPaused(hovering);
  }, []);

  const handleFocus = useCallback((focused: boolean) => {
    setPaused(focused);
  }, []);

  return (
    <section className="bg-off-white py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <SectionHeader
          title="How It Works"
          subtitle="We learn your business inside and out, then build the AI workflows and tooling that eliminate bottlenecks — not just agents, but complete systems."
        />

        {/* Live region for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Step {activeStep + 1} of {steps.length}: {steps[activeStep].title}
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          {/* Left: Step selector (~38% = 5 cols of 12) */}
          <div className="lg:col-span-5">
            <ProcessStepSelector
              activeStep={activeStep}
              progress={progress}
              onSelectStep={handleSelectStep}
              onHover={handleHover}
              onFocus={handleFocus}
            />
          </div>

          {/* Right: Visual panel (~62% = 7 cols of 12) */}
          <div className="lg:col-span-7">
            <ProcessVisualPanel activeStep={activeStep} />
          </div>
        </div>
      </div>
    </section>
  );
}
