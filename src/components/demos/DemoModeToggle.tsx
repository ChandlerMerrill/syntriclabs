"use client";

import type { DemoMode } from "@/lib/types";

interface DemoModeToggleProps {
  mode: DemoMode;
  onToggle: (mode: DemoMode) => void;
}

export default function DemoModeToggle({ mode, onToggle }: DemoModeToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200/60 bg-gray-50 p-1 text-sm shadow-sm">
      <button
        onClick={() => onToggle("demo")}
        className={`rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
          mode === "demo"
            ? "bg-white text-near-black shadow-sm"
            : "text-gray-400 hover:text-gray-700"
        }`}
      >
        Demo Mode
      </button>
      <button
        onClick={() => onToggle("live")}
        className={`rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
          mode === "live"
            ? "bg-white text-near-black shadow-sm"
            : "text-gray-400 hover:text-gray-700"
        }`}
      >
        Live Agent
      </button>
    </div>
  );
}
