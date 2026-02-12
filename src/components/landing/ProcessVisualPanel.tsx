"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ProcessSceneAudit from "./ProcessSceneAudit";
import ProcessSceneWorkflow from "./ProcessSceneWorkflow";
import ProcessSceneDashboard from "./ProcessSceneDashboard";

const scenes = [ProcessSceneAudit, ProcessSceneWorkflow, ProcessSceneDashboard];

interface ProcessVisualPanelProps {
  activeStep: number;
}

export default function ProcessVisualPanel({ activeStep }: ProcessVisualPanelProps) {
  const reducedMotion = useReducedMotion();
  const Scene = scenes[activeStep];

  return (
    <div
      id={`process-panel-${activeStep}`}
      role="tabpanel"
      aria-labelledby={`process-tab-${activeStep}`}
      className="min-h-[320px] sm:min-h-[360px]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={
            reducedMotion
              ? false
              : { opacity: 0, x: 20, filter: "blur(4px)" }
          }
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={
            reducedMotion
              ? undefined
              : { opacity: 0, x: -20, filter: "blur(4px)" }
          }
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <Scene />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
