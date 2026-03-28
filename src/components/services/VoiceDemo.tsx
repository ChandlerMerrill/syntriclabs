"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import GradientDivider from "@/components/ui/GradientDivider";
import { staggerContainer, fadeUp, popIn } from "@/lib/animations";

export default function VoiceDemo() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/vapi/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, topic: topic || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initiate call");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <section className="bg-grid py-24 sm:py-32">
      <GradientDivider className="mb-24 sm:mb-32" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={fadeUp}>
              <SectionLabel label="Try It" />
              <h2 className="mt-3 font-[family-name:var(--font-rajdhani)] text-3xl font-bold tracking-tight sm:text-4xl">
                Talk to an AI agent — right now
              </h2>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-text-secondary">
              This is a real voice agent, the same kind we build for our clients.
              Enter your phone number and you&apos;ll get a call back in seconds.
              Ask it questions, test it out, see how it handles a conversation.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-3 text-sm text-text-secondary/70">
              No recordings are kept. This is just a demo so you can experience
              what your customers would.
            </motion.p>
          </motion.div>

          {/* Form with ambient orb */}
          <motion.div
            variants={popIn}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="relative">
              {/* Pulsing purple ambient orb */}
              <div className="absolute -inset-4 rounded-3xl bg-accent-purple/[0.06] blur-2xl animate-[pulse-glow_4s_ease-in-out_infinite]" />

              <div className="relative rounded-2xl gradient-border-hover bg-bg-secondary p-8">
                <AnimatePresence mode="wait">
                  {status === "success" ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-8 text-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                        <CheckCircle className="h-7 w-7 text-emerald-400" />
                      </div>
                      <p className="mt-4 text-lg font-medium text-text-primary">
                        Call incoming!
                      </p>
                      <p className="mt-2 text-sm text-text-secondary">
                        You should receive a call at {phone} shortly.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <label
                          htmlFor="voice-name"
                          className="mb-1.5 block text-sm font-medium text-text-secondary"
                        >
                          Your name
                        </label>
                        <input
                          id="voice-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="voice-phone"
                          className="mb-1.5 block text-sm font-medium text-text-secondary"
                        >
                          Phone number
                        </label>
                        <input
                          id="voice-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="voice-topic"
                          className="mb-1.5 block text-sm font-medium text-text-secondary"
                        >
                          Topic{" "}
                          <span className="text-text-secondary/50">(optional)</span>
                        </label>
                        <input
                          id="voice-topic"
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                          placeholder="e.g., scheduling, customer support"
                        />
                      </div>

                      {status === "error" && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {errorMessage}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-light disabled:opacity-50"
                      >
                        {status === "loading" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Calling...
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4" />
                            Get a Callback
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
