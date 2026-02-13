"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, PenTool, TrendingUp } from "lucide-react";
import { useCallback, useRef } from "react";

export interface StepData {
  number: string;
  icon: typeof Search;
  title: string;
  subtitle: string;
  description: string;
  accent: "blue" | "violet" | "emerald";
}

export const steps: StepData[] = [
  {
    number: "01",
    icon: Search,
    title: "Understand Your Business",
    subtitle: "Deep-dive discovery audit",
    description:
      "We learn how your company operates — your team structure, customer journey, tools, and pain points. Then we start where automation and advanced tooling will have the biggest impact.",
    accent: "blue",
  },
  {
    number: "02",
    icon: PenTool,
    title: "Design & Deploy Workflows",
    subtitle: "End-to-end system architecture",
    description:
      "We don't just drop in a chatbot and call it a day. We architect end-to-end workflows — AI agents, integrations, and automation pipelines — designed around how your business actually runs.",
    accent: "violet",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Optimize & Scale",
    subtitle: "Continuous improvement loop",
    description:
      "We train your team, monitor performance, and iterate on your systems. As your business grows, your workflows scale with it — delivering measurable ROI.",
    accent: "emerald",
  },
];

const accentColors = {
  blue: {
    bar: "bg-blue-500",
    number: "text-blue-600",
    numberBg: "bg-blue-50",
    progress: "bg-blue-500",
    activeBorder: "border-blue-100",
    activeBg: "bg-blue-50/30",
    pill: "bg-blue-500",
    pillInactive: "bg-gray-200",
  },
  violet: {
    bar: "bg-violet-500",
    number: "text-violet-600",
    numberBg: "bg-violet-50",
    progress: "bg-violet-500",
    activeBorder: "border-violet-100",
    activeBg: "bg-violet-50/30",
    pill: "bg-violet-500",
    pillInactive: "bg-gray-200",
  },
  emerald: {
    bar: "bg-emerald-500",
    number: "text-emerald-600",
    numberBg: "bg-emerald-50",
    progress: "bg-emerald-500",
    activeBorder: "border-emerald-100",
    activeBg: "bg-emerald-50/30",
    pill: "bg-emerald-500",
    pillInactive: "bg-gray-200",
  },
};

interface ProcessStepSelectorProps {
  activeStep: number;
  progress: number;
  onSelectStep: (index: number) => void;
  onHover: (hovering: boolean) => void;
  onFocus: (focused: boolean) => void;
}

export default function ProcessStepSelector({
  activeStep,
  progress,
  onSelectStep,
  onHover,
  onFocus,
}: ProcessStepSelectorProps) {
  const reducedMotion = useReducedMotion();
  const stepsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = activeStep;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        next = (activeStep + 1) % steps.length;
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        next = (activeStep - 1 + steps.length) % steps.length;
      }
      if (next !== activeStep) {
        onSelectStep(next);
        stepsRef.current[next]?.focus();
      }
    },
    [activeStep, onSelectStep],
  );

  const activeColors = accentColors[steps[activeStep].accent];

  return (
    <>
      {/* Desktop: vertical step list */}
      <div
        className="hidden lg:flex lg:flex-col lg:gap-1"
        role="tablist"
        aria-label="Process steps"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onFocus(true)}
        onBlur={() => onFocus(false)}
      >
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const colors = accentColors[step.accent];

          return (
            <button
              key={step.number}
              ref={(el) => {
                stepsRef.current[i] = el;
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`process-panel-${i}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectStep(i)}
              onKeyDown={handleKeyDown}
              className={`relative flex items-start gap-4 rounded-xl px-5 py-4 text-left transition-colors duration-200 ${
                isActive
                  ? `${colors.activeBg} ${colors.activeBorder} border`
                  : "border border-transparent hover:bg-gray-50/80"
              }`}
            >
              {/* Accent bar */}
              {isActive && (
                <motion.div
                  layoutId="processAccent"
                  className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${colors.bar}`}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 300, damping: 28 }
                  }
                />
              )}

              {/* Number badge */}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors duration-200 ${
                  isActive
                    ? `${colors.numberBg} ${colors.number}`
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step.number}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <h3
                  className={`text-sm font-bold transition-colors duration-200 ${
                    isActive ? "text-near-black" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </h3>

                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      initial={
                        reducedMotion ? false : { height: 0, opacity: 0 }
                      }
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="mt-1 text-xs font-medium text-gray-400">
                        {step.subtitle}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {step.description}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${colors.progress} transition-[width] duration-[70ms] linear`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: tab pills */}
      <div
        className="flex lg:hidden items-center justify-center gap-3 mb-6"
        role="tablist"
        aria-label="Process steps"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const colors = accentColors[step.accent];

          return (
            <button
              key={step.number}
              role="tab"
              aria-selected={isActive}
              aria-controls={`process-panel-${i}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectStep(i)}
              onKeyDown={handleKeyDown}
              onFocus={() => onFocus(true)}
              onBlur={() => onFocus(false)}
              className={`relative flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition-all duration-200 ${
                isActive
                  ? `bg-near-black text-white shadow-md`
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200/70"
              }`}
            >
              {step.number}
              {isActive && (
                <span className="text-xs font-medium opacity-80">
                  {step.title.split(" ")[0]}
                </span>
              )}

              {/* Progress indicator on active pill */}
              {isActive && (
                <div className="absolute -bottom-1 left-2 right-2 h-0.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className={`h-full rounded-full bg-white/80 transition-[width] duration-[70ms] linear`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: active step content */}
      <div className="lg:hidden mb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="text-lg font-bold text-near-black">
              {steps[activeStep].title}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {steps[activeStep].subtitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {steps[activeStep].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
