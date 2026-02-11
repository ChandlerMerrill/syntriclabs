"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CRMContact, CRMTicket, CRMAppointment, DemoEvent, DemoMode } from "@/lib/types";

interface CRMState {
  contacts: CRMContact[];
  tickets: CRMTicket[];
  appointments: CRMAppointment[];
}

interface UseDemoModeReturn {
  mode: DemoMode;
  setMode: (mode: DemoMode) => void;
  crm: CRMState;
  isRunning: boolean;
  startDemo: () => void;
  resetCRM: () => void;
  addContact: (contact: CRMContact) => void;
  addTicket: (ticket: CRMTicket) => void;
  addAppointment: (appointment: CRMAppointment) => void;
}

const emptyCRM: CRMState = {
  contacts: [],
  tickets: [],
  appointments: [],
};

export function useDemoMode(events: DemoEvent[]): UseDemoModeReturn {
  const [mode, setMode] = useState<DemoMode>("demo");
  const [crm, setCRM] = useState<CRMState>(emptyCRM);
  const [isRunning, setIsRunning] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addContact = useCallback((contact: CRMContact) => {
    setCRM((prev) => ({ ...prev, contacts: [...prev.contacts, contact] }));
  }, []);

  const addTicket = useCallback((ticket: CRMTicket) => {
    setCRM((prev) => ({ ...prev, tickets: [...prev.tickets, ticket] }));
  }, []);

  const addAppointment = useCallback((appointment: CRMAppointment) => {
    setCRM((prev) => ({
      ...prev,
      appointments: [...prev.appointments, appointment],
    }));
  }, []);

  const resetCRM = useCallback(() => {
    clearTimers();
    setCRM(emptyCRM);
    setIsRunning(false);
  }, [clearTimers]);

  const startDemo = useCallback(() => {
    resetCRM();
    setIsRunning(true);

    events.forEach((event) => {
      const timer = setTimeout(() => {
        if (event.type === "contact") addContact(event.data as CRMContact);
        if (event.type === "ticket") addTicket(event.data as CRMTicket);
        if (event.type === "appointment") addAppointment(event.data as CRMAppointment);
      }, event.delay);
      timersRef.current.push(timer);
    });

    // Mark as done after last event
    const maxDelay = Math.max(...events.map((e) => e.delay));
    const doneTimer = setTimeout(() => setIsRunning(false), maxDelay + 1000);
    timersRef.current.push(doneTimer);
  }, [events, resetCRM, addContact, addTicket, addAppointment]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    mode,
    setMode,
    crm,
    isRunning,
    startDemo,
    resetCRM,
    addContact,
    addTicket,
    addAppointment,
  };
}
