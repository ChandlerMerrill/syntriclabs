"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";
import type { CRMContact } from "@/lib/types";

export default function CRMContactCard({ contact }: { contact: CRMContact }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
          <User className="h-3.5 w-3.5 text-blue-600" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Contact Created
        </span>
      </div>
      <div className="space-y-0.5 text-sm">
        <p className="font-semibold text-near-black">{contact.name}</p>
        {contact.email && <p className="text-gray-500">{contact.email}</p>}
        {contact.phone && <p className="text-gray-500">{contact.phone}</p>}
      </div>
    </motion.div>
  );
}
