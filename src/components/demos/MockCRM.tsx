"use client";

import { Database } from "lucide-react";
import type { CRMContact, CRMTicket, CRMAppointment } from "@/lib/types";
import CRMContactCard from "./CRMContactCard";
import CRMTicketCard from "./CRMTicketCard";
import CRMAppointmentCard from "./CRMAppointmentCard";

interface MockCRMProps {
  contacts: CRMContact[];
  tickets: CRMTicket[];
  appointments: CRMAppointment[];
  onClear: () => void;
}

export default function MockCRM({
  contacts,
  tickets,
  appointments,
  onClear,
}: MockCRMProps) {
  const isEmpty =
    contacts.length === 0 &&
    tickets.length === 0 &&
    appointments.length === 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200/60 bg-off-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200/60 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <Database className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <span className="text-sm font-bold text-near-black">
            CRM Dashboard
          </span>
        </div>
        {!isEmpty && (
          <button
            onClick={onClear}
            className="rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isEmpty && (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Database className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-400">
                CRM entries will appear here
                <br />
                as the agent interacts...
              </p>
            </div>
          </div>
        )}
        {contacts.map((c) => (
          <CRMContactCard key={c.id} contact={c} />
        ))}
        {tickets.map((t) => (
          <CRMTicketCard key={t.id} ticket={t} />
        ))}
        {appointments.map((a) => (
          <CRMAppointmentCard key={a.id} appointment={a} />
        ))}
      </div>
    </div>
  );
}
