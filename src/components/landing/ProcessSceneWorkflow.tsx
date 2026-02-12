"use client";

import { motion, useReducedMotion } from "framer-motion";
import { UserPlus, MessageSquare, Database, Bell } from "lucide-react";

const nodes = [
  { icon: UserPlus, label: "Inbound Lead", color: "bg-blue-50 text-blue-600 border-blue-200/60" },
  { icon: MessageSquare, label: "AI Chat Agent", color: "bg-violet-50 text-violet-600 border-violet-200/60" },
  { icon: Database, label: "CRM Update", color: "bg-amber-50 text-amber-600 border-amber-200/60" },
  { icon: Bell, label: "Team Alert", color: "bg-emerald-50 text-emerald-600 border-emerald-200/60" },
];

const spring = { type: "spring" as const, stiffness: 200, damping: 20 };

export default function ProcessSceneWorkflow() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
          <Database className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-near-black">Workflow Blueprint</h4>
          <p className="text-xs text-gray-400">End-to-end automation pipeline</p>
        </div>
        <div className="ml-auto flex h-2 w-2 rounded-full bg-violet-500" />
      </div>

      <div className="mb-4 h-px bg-gray-100" />

      {/* Nodes flow */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-4 lg:gap-y-0">
        {nodes.map((node, i) => (
          <div key={node.label} className="relative flex flex-col items-center">
            {/* Connector line (between nodes, not before first) */}
            {i > 0 && (
              <motion.div
                initial={reducedMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  ...spring,
                  delay: reducedMotion ? 0 : 0.2 + i * 0.25,
                }}
                className="absolute top-6 -left-1/2 hidden h-px w-full origin-left bg-gradient-to-r from-gray-200 to-gray-300 lg:block"
                style={{ transform: undefined }} // let framer control
              />
            )}
            {/* Mobile connector (vertical, between rows) */}
            {i === 2 && (
              <motion.div
                initial={reducedMotion ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  ...spring,
                  delay: reducedMotion ? 0 : 0.5,
                }}
                className="absolute -top-3 left-1/2 h-3 w-px origin-top bg-gray-200 lg:hidden"
              />
            )}

            {/* Node circle */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                ...spring,
                delay: reducedMotion ? 0 : 0.15 + i * 0.25,
              }}
              className={`flex h-12 w-12 items-center justify-center rounded-full border ${node.color}`}
            >
              <node.icon className="h-5 w-5" />
            </motion.div>

            {/* Label */}
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: reducedMotion ? 0 : 0.3 + i * 0.25,
              }}
              className="mt-2.5 text-center text-xs font-semibold text-near-black"
            >
              {node.label}
            </motion.p>
          </div>
        ))}
      </div>
    </div>
  );
}
