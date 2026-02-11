"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";

interface ChatMessage {
  role: "agent" | "user";
  text: string;
}

interface ChatWidgetProps {
  transcript: { role: "agent" | "user"; text: string; delay: number }[];
  isRunning: boolean;
}

export default function ChatWidget({ transcript, isRunning }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!isRunning) {
      setMessages([]);
      return;
    }

    setMessages([]);
    transcript.forEach((msg) => {
      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, { role: msg.role, text: msg.text }]);
      }, msg.delay);
      timersRef.current.push(timer);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isRunning, transcript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200/60 bg-white shadow-sm">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-gray-200/60 px-5 py-3.5">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-near-black">
            Syntric AI Agent
          </p>
          <p className="text-xs text-green-500 font-medium">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && !isRunning && (
          <div className="flex h-full min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-bg">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                Start the demo to see the
                <br />
                chat agent in action.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-gray-50 text-near-black border border-gray-100 rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area (visual only) */}
      <div className="border-t border-gray-200/60 px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
          <span className="flex-1 text-sm text-gray-400">
            {isRunning ? "Agent is typing..." : "Type a message..."}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Send className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
