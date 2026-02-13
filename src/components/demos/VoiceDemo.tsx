"use client";

import { Phone, Database, PhoneCall } from "lucide-react";
import AnimateIn from "@/components/ui/AnimateIn";
import CallbackForm from "./CallbackForm";
import CRMContactCard from "./CRMContactCard";
import CRMTicketCard from "./CRMTicketCard";
import CRMAppointmentCard from "./CRMAppointmentCard";

const staticVoiceCRM = {
  contact: {
    id: "vc1",
    name: "Mark Thompson",
    email: "",
    phone: "(555) 123-4567",
    company: "Thompson & Co",
    source: "AI Voice Agent",
    createdAt: "",
  },
  ticket: {
    id: "vt1",
    contactId: "vc1",
    type: "Voice Agent Inquiry",
    description:
      "50 calls/day — billing & appointment scheduling. Scope AI voice agent solution.",
    status: "open" as const,
    priority: "medium",
    assignedTo: "Support Team",
    source: "AI Voice Agent",
    createdAt: "",
  },
  appointment: {
    id: "va1",
    contactId: "vc1",
    date: "Tuesday",
    time: "10:00 AM",
    purpose: "Demo call — AI voice agent for inbound support",
    attendee: "Mark Thompson",
    source: "AI Voice Agent",
    createdAt: "",
  },
};

export default function VoiceDemo() {
  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8">
        <AnimateIn>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-600">
            AI Voice Agent
          </div>
          <h3 className="text-2xl font-extrabold text-near-black">
            Phone Calls That Handle Themselves
          </h3>
          <p className="mt-2 max-w-2xl leading-relaxed text-gray-600">
            Our AI voice agent answers calls, qualifies leads, books
            appointments, and updates your CRM — all in a natural, human-like
            conversation.
          </p>
        </AnimateIn>
      </div>

      {/* ── Live demo banner ── */}
      <AnimateIn delay={0.05}>
        <div
          className="mb-6 flex items-center gap-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-violet-50 px-6 py-4"
          style={{ animation: "pulse-violet-glow 1.4s ease-in-out infinite alternate" }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <PhoneCall className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-near-black">
              Try it now — get a real call from our AI agent
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              Enter your phone number and our AI voice agent will call you
              within seconds. No signup required.
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live Demo
          </span>
        </div>
      </AnimateIn>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Static CRM Dashboard ── */}
        <div className="order-2 lg:order-1 lg:col-span-3">
          <AnimateIn delay={0.15}>
            <div className="flex h-full flex-col rounded-2xl border border-gray-200/60 bg-off-white shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-gray-200/60 px-5 py-3.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                  <Database className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <span className="text-sm font-bold text-near-black">
                  Your CRM Dashboard
                </span>
                <span className="ml-auto rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-bold text-green-600">
                  3 new
                </span>
              </div>
              <p className="px-5 pt-3 text-xs text-gray-400">
                After your call, the agent automatically logs everything:
              </p>
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Recent Contacts
                  </p>
                  <CRMContactCard contact={staticVoiceCRM.contact} />
                </div>
                <div>
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Open Tickets
                  </p>
                  <CRMTicketCard ticket={staticVoiceCRM.ticket} />
                </div>
                <div>
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Upcoming
                  </p>
                  <CRMAppointmentCard appointment={staticVoiceCRM.appointment} />
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>

        {/* ── Real Callback Form ── */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <AnimateIn delay={0.1}>
            <div
              className="rounded-2xl border-2 border-violet-200 bg-white p-6"
              style={{ animation: "pulse-violet-glow-elevated 1.4s ease-in-out infinite alternate" }}
            >
              {/* Accent bar */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-near-black">
                      Request a Call
                    </h4>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                      </span>
                      Live
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Our AI voice agent will call you within moments.
                  </p>
                </div>
              </div>

              <CallbackForm />

              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-violet-50/80 px-4 py-3">
                <Phone className="h-4 w-4 shrink-0 text-violet-500" />
                <p className="text-xs leading-relaxed text-violet-700">
                  This is a{" "}
                  <span className="font-semibold">real AI agent</span> — it
                  will call your phone and have a natural conversation.
                </p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>
    </div>
  );
}
