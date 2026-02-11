"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneCall } from "lucide-react";

type CallStatus = "idle" | "ringing" | "connected" | "ended";

interface TranscriptLine {
  role: "agent" | "user";
  text: string;
  delay: number;
}

interface CallVisualizationProps {
  transcript: TranscriptLine[];
  isRunning: boolean;
  onStart: () => void;
}

export default function CallVisualization({
  transcript,
  isRunning,
  onStart,
}: CallVisualizationProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [lines, setLines] = useState<{ role: string; text: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!isRunning) {
      return;
    }

    setLines([]);
    setStatus("ringing");

    // Ringing for 2 seconds, then connected
    const ringTimer = setTimeout(() => {
      setStatus("connected");
      onStart();
    }, 2000);
    timersRef.current.push(ringTimer);

    // Transcript lines appear on schedule (offset by ring time)
    transcript.forEach((line) => {
      const timer = setTimeout(() => {
        setLines((prev) => [...prev, { role: line.role, text: line.text }]);
      }, line.delay + 2000);
      timersRef.current.push(timer);
    });

    // End call after transcript finishes
    const maxDelay = Math.max(...transcript.map((l) => l.delay));
    const endTimer = setTimeout(() => {
      setStatus("ended");
    }, maxDelay + 4000);
    timersRef.current.push(endTimer);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isRunning, transcript, onStart]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  if (status === "idle" && !isRunning) return null;

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4">
      {/* Status indicator */}
      <div className="mb-4 flex items-center gap-3">
        <AnimatePresence mode="wait">
          {status === "ringing" && (
            <motion.div
              key="ringing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100"
              >
                <Phone className="h-5 w-5 text-yellow-600" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-near-black">
                  Ringing...
                </p>
                <p className="text-xs text-gray-400">
                  Connecting to AI agent
                </p>
              </div>
            </motion.div>
          )}

          {status === "connected" && (
            <motion.div
              key="connected"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <PhoneCall className="h-5 w-5 text-green-600" />
                {/* Pulse ring */}
                <motion.div
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full border-2 border-green-400"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-near-black">
                  Connected
                </p>
                <p className="text-xs text-gray-400">
                  Call in progress
                </p>
              </div>
            </motion.div>
          )}

          {status === "ended" && (
            <motion.div
              key="ended"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-near-black">
                  Call ended
                </p>
                <p className="text-xs text-gray-400">
                  Transcript below
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waveform animation */}
        {status === "connected" && (
          <div className="ml-auto flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 20, 8] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  delay: i * 0.15,
                }}
                className="w-1 rounded-full bg-primary"
                style={{ height: 8 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transcript */}
      {lines.length > 0 && (
        <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-lg bg-off-white p-3">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm"
            >
              <span
                className={`font-medium ${
                  line.role === "agent" ? "text-primary" : "text-gray-700"
                }`}
              >
                {line.role === "agent" ? "AI Agent" : "Caller"}:
              </span>{" "}
              <span className="text-near-black">{line.text}</span>
            </motion.div>
          ))}
          <div ref={scrollRef} />
        </div>
      )}
    </div>
  );
}
