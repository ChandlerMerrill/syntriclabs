"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Loader2, Send, User } from "lucide-react"

/**
 * The form the assistant puts on screen when a visitor wants a person.
 *
 * It collects contact details rather than letting the model transcribe them
 * from chat. A model that mishears one character of an email address produces a
 * lead nobody can ever reply to, and the failure is silent — the visitor sees a
 * cheerful confirmation either way. Typed into a field, the address is theirs.
 *
 * One card, one submit, no navigation away from the conversation.
 */

const URGENCY_OPTIONS = [
  { value: "whenever", label: "No rush" },
  { value: "this_week", label: "This week" },
  { value: "urgent", label: "Asap" },
] as const

type Urgency = (typeof URGENCY_OPTIONS)[number]["value"]

interface RequestFormProps {
  sessionId: string
  conversationId: string | null
  /** The ask, as the assistant understood it. Editable — it's a starting point. */
  topic: string | null
  pathname: string
}

export default function RequestForm({
  sessionId,
  conversationId,
  topic,
  pathname,
}: RequestFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [details, setDetails] = useState(topic ?? "")
  const [urgency, setUrgency] = useState<Urgency>("this_week")
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status !== "idle") return

    if (!details.trim()) {
      setError("Add a line about what you need.")
      return
    }
    if (!email.trim() && !phone.trim()) {
      setError("An email or phone number, so Chandler can get back to you.")
      return
    }

    setStatus("sending")
    setError(null)
    try {
      const res = await fetch("/api/widget/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          conversationId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          details: details.trim(),
          preferredContact: email.trim() ? "email" : "phone",
          urgency,
          pathname,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? "That didn't go through. Try again in a moment?")
        setStatus("idle")
        return
      }
      setStatus("sent")
    } catch {
      setError("That didn't go through. Try again in a moment?")
      setStatus("idle")
    }
  }

  if (status === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mb-3 ml-9 max-w-[85%] rounded-2xl border border-emerald-500/20 bg-white p-3.5 shadow-sm shadow-black/[0.03]"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-3 w-3 text-emerald-600" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">Sent to Chandler</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              He reads these himself — usually the same day. Anything else I can help
              with in the meantime?
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mb-3 ml-9 max-w-[92%] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-black/[0.04]"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 to-white px-3.5 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]">
          <User className="h-3 w-3 text-white" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">Send this to Chandler</p>
          <p className="text-[11px] text-slate-500">Goes to his inbox, not a queue.</p>
        </div>
      </div>

      <div className="space-y-2.5 p-3.5">
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="What do you need?"
          className="widget-input-no-ring w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[13px] leading-relaxed text-slate-700 transition-colors placeholder:text-slate-400 focus:border-[#6366F1]/50 focus:bg-white focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoComplete="name"
            className="widget-input-no-ring rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[13px] text-slate-700 transition-colors placeholder:text-slate-400 focus:border-[#6366F1]/50 focus:bg-white focus:outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            type="tel"
            autoComplete="tel"
            className="widget-input-no-ring rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[13px] text-slate-700 transition-colors placeholder:text-slate-400 focus:border-[#6366F1]/50 focus:bg-white focus:outline-none"
          />
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          className="widget-input-no-ring w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[13px] text-slate-700 transition-colors placeholder:text-slate-400 focus:border-[#6366F1]/50 focus:bg-white focus:outline-none"
        />

        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="mr-0.5 text-[11px] font-medium text-slate-400">When</span>
          {URGENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setUrgency(opt.value)}
              aria-pressed={urgency === opt.value}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
                urgency === opt.value
                  ? "bg-[#6366F1]/10 text-[#4F46E5] ring-1 ring-[#6366F1]/30"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-[11px] font-medium text-red-500" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] px-3 py-2.5 text-[13px] font-medium text-white shadow-sm shadow-indigo-500/25 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Send to Chandler
            </>
          )}
        </button>
      </div>
    </motion.form>
  )
}
