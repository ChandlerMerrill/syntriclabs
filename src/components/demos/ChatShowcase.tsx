"use client";

import { MessageSquare, Send, Clock, UserPlus, FileText, CalendarCheck, ArrowRight } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import Button from "@/components/ui/Button";
import CRMContactCard from "./CRMContactCard";
import CRMTicketCard from "./CRMTicketCard";
import CRMAppointmentCard from "./CRMAppointmentCard";
import { Database } from "lucide-react";

const staticMessages = [
  { role: "agent" as const, text: "Hi! Welcome to Syntric Labs. How can I help you today?" },
  { role: "user" as const, text: "I'm looking to automate our customer support workflow." },
  { role: "agent" as const, text: "Great! Could I get your name and email to set up your profile?" },
  { role: "user" as const, text: "Sure — I'm Sarah Chen, sarah@acmecorp.com" },
  { role: "agent" as const, text: "Thanks, Sarah! I've created your contact and a support ticket. Would you like to book a consultation?" },
];

const staticCRM = {
  contact: { id: "c1", name: "Sarah Chen", email: "sarah@acmecorp.com", phone: "", createdAt: "" },
  ticket: { id: "t1", contactId: "c1", type: "Support Automation", description: "200 tickets/day — billing & order status inquiries. Scope AI chat agent solution.", status: "open" as const, createdAt: "" },
  appointment: { id: "a1", contactId: "c1", date: "Thursday", time: "2:00 PM", purpose: "Consultation — AI chat agent for customer support", createdAt: "" },
};

const capabilities = [
  { icon: Clock, title: "24/7 Availability", description: "Always-on support that never sleeps or takes a break." },
  { icon: UserPlus, title: "Lead Capture", description: "Automatically collects contact info and enriches your CRM." },
  { icon: FileText, title: "Ticket Creation", description: "Creates and categorizes support tickets in real time." },
  { icon: CalendarCheck, title: "Appointment Booking", description: "Schedules meetings and sends confirmations instantly." },
];

export default function ChatShowcase() {
  return (
    <div>
      <div className="mb-8">
        <AnimateIn>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
            AI Chat Agent
          </div>
          <h3 className="text-2xl font-extrabold text-near-black">
            Intelligent Conversations That Convert
          </h3>
          <p className="mt-2 max-w-2xl leading-relaxed text-gray-500">
            Our AI chat agents handle customer inquiries, capture leads, create tickets, and book appointments — all without human intervention.
          </p>
        </AnimateIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chat mockup */}
        <div className="lg:col-span-3">
          <AnimateIn>
            <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-sm">
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-gray-200/60 px-5 py-3.5">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-near-black">Syntric AI Agent</p>
                  <p className="text-xs font-medium text-green-500">Online</p>
                </div>
              </div>

              {/* Static messages */}
              <div className="space-y-3 p-5">
                {staticMessages.map((msg, i) => (
                  <AnimateIn key={i} delay={i * 0.08}>
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "rounded-br-md bg-primary text-white"
                            : "rounded-bl-md border border-gray-100 bg-gray-50 text-near-black"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>

              {/* Input area (visual only) */}
              <div className="border-t border-gray-200/60 px-4 py-3">
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex-1 text-sm text-gray-400">Type a message...</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Send className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>

        {/* Static CRM panel */}
        <div className="lg:col-span-2">
          <AnimateIn delay={0.15}>
            <div className="flex h-full flex-col rounded-2xl border border-gray-200/60 bg-off-white shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-gray-200/60 px-5 py-3.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                  <Database className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <span className="text-sm font-bold text-near-black">CRM Dashboard</span>
              </div>
              <div className="space-y-3 p-4">
                <CRMContactCard contact={staticCRM.contact} />
                <CRMTicketCard ticket={staticCRM.ticket} />
                <CRMAppointmentCard appointment={staticCRM.appointment} />
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>

      {/* Try it live callout */}
      <AnimateIn delay={0.2}>
        <div className="mt-8 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 px-6 py-5">
          <div>
            <p className="font-bold text-near-black">Want to try it yourself?</p>
            <p className="mt-1 text-sm text-gray-500">
              Click the chat icon in the bottom-right corner to talk to our live AI agent.
            </p>
          </div>
          <div className="hidden sm:block">
            <Button href="/contact" size="sm" variant="outline">
              Or book a demo
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </AnimateIn>

      {/* Capability cards */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {capabilities.map((cap, i) => (
          <AnimateIn key={cap.title} delay={0.1 + i * 0.08}>
            <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <cap.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="text-sm font-bold text-near-black">{cap.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{cap.description}</p>
            </div>
          </AnimateIn>
        ))}
      </div>
    </div>
  );
}
