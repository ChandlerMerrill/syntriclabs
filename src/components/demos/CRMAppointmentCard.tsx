"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import type { CRMAppointment } from "@/lib/types";

export default function CRMAppointmentCard({
  appointment,
}: {
  appointment: CRMAppointment;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50">
          <Calendar className="h-3.5 w-3.5 text-green-600" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Appointment Booked
        </span>
      </div>
      <div className="space-y-0.5 text-sm">
        <p className="font-semibold text-near-black">
          {appointment.date} at {appointment.time}
        </p>
        <p className="leading-relaxed text-gray-500">{appointment.purpose}</p>
      </div>
    </motion.div>
  );
}
