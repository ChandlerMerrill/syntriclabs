"use client";

import { useDemoMode } from "@/hooks/useDemoMode";
import { chatDemoEvents, chatDemoTranscript } from "@/lib/demo-scripts";
import DemoModeToggle from "./DemoModeToggle";
import ChatWidget from "./ChatWidget";
import MockCRM from "./MockCRM";
import Button from "@/components/ui/Button";

export default function ChatDemo() {
  const { mode, setMode, crm, isRunning, startDemo, resetCRM } =
    useDemoMode(chatDemoEvents);

  return (
    <div id="chat-demo" className="scroll-mt-24">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
            Demo 1
          </div>
          <h3 className="text-2xl font-extrabold text-near-black">
            AI Chat Agent
          </h3>
          <p className="mt-1 max-w-lg leading-relaxed text-gray-500">
            Watch an AI agent handle a customer inquiry, capture contact info,
            create a ticket, and book an appointment — all in real time.
          </p>
        </div>
        <DemoModeToggle mode={mode} onToggle={setMode} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChatWidget transcript={chatDemoTranscript} isRunning={isRunning} />
        </div>
        <div className="lg:col-span-2">
          <MockCRM
            contacts={crm.contacts}
            tickets={crm.tickets}
            appointments={crm.appointments}
            onClear={resetCRM}
          />
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <Button onClick={startDemo} disabled={isRunning} size="sm">
          {isRunning ? "Running..." : "Start Demo"}
        </Button>
        <Button onClick={resetCRM} variant="secondary" size="sm">
          Reset
        </Button>
      </div>
    </div>
  );
}
