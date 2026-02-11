"use client";

import { useState, useCallback } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { voiceDemoEvents, voiceDemoTranscript } from "@/lib/demo-scripts";
import DemoModeToggle from "./DemoModeToggle";
import CallbackForm from "./CallbackForm";
import CallVisualization from "./CallVisualization";
import MockCRM from "./MockCRM";

export default function VoiceDemo() {
  const { mode, setMode, crm, isRunning, startDemo, resetCRM } =
    useDemoMode(voiceDemoEvents);
  const [submitted, setSubmitted] = useState(false);

  const handleFormSubmit = useCallback(() => {
    setSubmitted(true);
    startDemo();
  }, [startDemo]);

  const handleReset = useCallback(() => {
    resetCRM();
    setSubmitted(false);
  }, [resetCRM]);

  const noop = useCallback(() => {}, []);

  return (
    <div id="voice-demo" className="scroll-mt-24">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-600">
            Demo 2
          </div>
          <h3 className="text-2xl font-extrabold text-near-black">
            AI Voice Agent
          </h3>
          <p className="mt-1 max-w-lg leading-relaxed text-gray-500">
            Request a callback and watch the AI voice agent handle the
            conversation, log details, and schedule a follow-up.
          </p>
        </div>
        <DemoModeToggle mode={mode} onToggle={setMode} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
            <h4 className="mb-1 text-lg font-bold text-near-black">
              Talk to our AI agent
            </h4>
            <p className="mb-5 text-sm text-gray-500">
              Fill out the form and our AI will call you back.
            </p>
            <CallbackForm onSubmit={handleFormSubmit} disabled={isRunning} />
            <CallVisualization
              transcript={voiceDemoTranscript}
              isRunning={submitted && isRunning}
              onStart={noop}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <MockCRM
            contacts={crm.contacts}
            tickets={crm.tickets}
            appointments={crm.appointments}
            onClear={handleReset}
          />
        </div>
      </div>

      {submitted && !isRunning && (
        <div className="mt-5">
          <button
            onClick={handleReset}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm"
          >
            Reset Demo
          </button>
        </div>
      )}
    </div>
  );
}
