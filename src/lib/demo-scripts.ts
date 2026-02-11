import { DemoEvent, CRMContact, CRMTicket, CRMAppointment } from "./types";

// ── Chat Demo Script ──────────────────────────────────────────────────

export const chatDemoTranscript = [
  { role: "agent" as const, text: "Hi! Welcome to Syntric Labs. How can I help you today?", delay: 0 },
  { role: "user" as const, text: "I'm looking to automate our customer support workflow.", delay: 2500 },
  { role: "agent" as const, text: "Great! I can help with that. Could I get your name and email to set up your profile?", delay: 5000 },
  { role: "user" as const, text: "Sure — I'm Sarah Chen, sarah@acmecorp.com", delay: 8000 },
  { role: "agent" as const, text: "Thanks, Sarah! I've created your contact. What kind of support volume are you handling right now?", delay: 10500 },
  { role: "user" as const, text: "About 200 tickets a day, mostly repetitive questions about billing and order status.", delay: 13500 },
  { role: "agent" as const, text: "That's a perfect use case for an AI chat agent. I'll create a ticket so our team can scope a solution for you. Would you also like to book a consultation call?", delay: 16500 },
  { role: "user" as const, text: "Yes, let's do Thursday at 2pm.", delay: 19500 },
  { role: "agent" as const, text: "Done! I've booked you for Thursday at 2:00 PM. Our team will reach out to confirm. Anything else I can help with?", delay: 22000 },
  { role: "user" as const, text: "That's all, thanks!", delay: 25000 },
  { role: "agent" as const, text: "You're welcome, Sarah! Talk soon.", delay: 27000 },
];

export const chatDemoEvents: DemoEvent[] = [
  {
    type: "contact",
    delay: 10500,
    data: {
      id: "c1",
      name: "Sarah Chen",
      email: "sarah@acmecorp.com",
      phone: "",
      createdAt: new Date().toISOString(),
    } as CRMContact,
  },
  {
    type: "ticket",
    delay: 16500,
    data: {
      id: "t1",
      contactId: "c1",
      type: "Support Automation",
      description: "200 tickets/day — billing & order status inquiries. Scope AI chat agent solution.",
      status: "open",
      createdAt: new Date().toISOString(),
    } as CRMTicket,
  },
  {
    type: "appointment",
    delay: 22000,
    data: {
      id: "a1",
      contactId: "c1",
      date: "Thursday",
      time: "2:00 PM",
      purpose: "Consultation — AI chat agent for customer support",
      createdAt: new Date().toISOString(),
    } as CRMAppointment,
  },
];

// ── Voice Demo Script ─────────────────────────────────────────────────

export const voiceDemoTranscript = [
  { role: "agent" as const, text: "Hello! This is the Syntric Labs AI assistant calling for Mark. Is this a good time?", delay: 0 },
  { role: "user" as const, text: "Yes, hi! I requested a callback about your voice agent services.", delay: 3000 },
  { role: "agent" as const, text: "Absolutely. I'd love to learn more about what you're looking for. What does your current call handling process look like?", delay: 6000 },
  { role: "user" as const, text: "We have a small team managing about 50 inbound calls a day — mostly scheduling and basic inquiries.", delay: 9500 },
  { role: "agent" as const, text: "Got it. An AI voice agent could handle those routine calls and free your team for complex issues. Let me create a support request for our team to follow up.", delay: 13000 },
  { role: "user" as const, text: "Sounds good. Can we also schedule a demo call for next week?", delay: 16500 },
  { role: "agent" as const, text: "Of course! How does Tuesday at 10 AM work for you?", delay: 19000 },
  { role: "user" as const, text: "Perfect.", delay: 21000 },
  { role: "agent" as const, text: "Great, you're all set for Tuesday at 10 AM. Thanks for your time, Mark — our team will be in touch!", delay: 22500 },
];

export const voiceDemoEvents: DemoEvent[] = [
  {
    type: "contact",
    delay: 6000,
    data: {
      id: "c2",
      name: "Mark Thompson",
      email: "",
      phone: "(555) 123-4567",
      createdAt: new Date().toISOString(),
    } as CRMContact,
  },
  {
    type: "ticket",
    delay: 13000,
    data: {
      id: "t2",
      contactId: "c2",
      type: "Voice Agent Inquiry",
      description: "50 inbound calls/day — scheduling & basic inquiries. Explore AI voice agent solution.",
      status: "open",
      createdAt: new Date().toISOString(),
    } as CRMTicket,
  },
  {
    type: "appointment",
    delay: 22500,
    data: {
      id: "a2",
      contactId: "c2",
      date: "Tuesday",
      time: "10:00 AM",
      purpose: "Demo — AI voice agent for inbound call handling",
      createdAt: new Date().toISOString(),
    } as CRMAppointment,
  },
];
