"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Clock, PhoneOff, RefreshCw, Moon } from "lucide-react";

const bottlenecks = [
  {
    icon: Clock,
    label: "Manual lead routing",
    detail: "~4 hrs/week wasted",
    severity: "red" as const,
  },
  {
    icon: PhoneOff,
    label: "Missed callbacks",
    detail: "23% customer drop-off",
    severity: "orange" as const,
  },
  {
    icon: RefreshCw,
    label: "Duplicate data entry",
    detail: "3 systems, no sync",
    severity: "red" as const,
  },
  {
    icon: Moon,
    label: "After-hours coverage",
    detail: "0%, all leads lost",
    severity: "orange" as const,
  },
];

const severityColors = {
  red: "bg-red-500",
  orange: "bg-orange-400",
};

export default function ProcessSceneAudit() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-near-black">Discovery Audit</h4>
          <p className="text-xs text-gray-400">Bottleneck analysis results</p>
        </div>
        <div className="ml-auto flex h-2 w-2 rounded-full bg-blue-500" />
      </div>

      {/* Divider */}
      <div className="mb-4 h-px bg-gray-100" />

      {/* Bottleneck items */}
      <div className="space-y-3">
        {bottlenecks.map((item, i) => (
          <motion.div
            key={item.label}
            initial={reducedMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.4,
              delay: reducedMotion ? 0 : 0.15 + i * 0.3,
              ease: "easeOut",
            }}
            className="flex items-center gap-3 rounded-xl bg-gray-50/80 px-4 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200/60">
              <item.icon className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-near-black truncate">
                {item.label}
              </p>
              <p className="text-xs text-gray-400">{item.detail}</p>
            </div>
            <div
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityColors[item.severity]}`}
              title={item.severity === "red" ? "High severity" : "Medium severity"}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
