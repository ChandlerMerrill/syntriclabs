"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import type { CRMTicket } from "@/lib/types";

const statusColors = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-green-50 text-green-700",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-50 text-yellow-700",
  high: "bg-red-50 text-red-700",
};

export default function CRMTicketCard({ ticket }: { ticket: CRMTicket }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
            <FileText className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Ticket Created
          </span>
        </div>
        {ticket.source && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
            via {ticket.source}
          </span>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-near-black">{ticket.type}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[ticket.status]}`}
          >
            {ticket.status.replace("_", " ")}
          </span>
          {ticket.priority && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityColors[ticket.priority] ?? priorityColors.medium}`}
            >
              {ticket.priority}
            </span>
          )}
        </div>
        <p className="leading-relaxed text-gray-500">{ticket.description}</p>
        {ticket.assignedTo && (
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Assigned</span>
            <span className="text-xs font-medium text-gray-500">{ticket.assignedTo}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
