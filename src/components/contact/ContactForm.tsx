"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";

const contactMethods = [
  { label: "Email", value: "Email" },
  { label: "Phone", value: "Phone" },
  { label: "Text Message", value: "SMS" },
];

const serviceOptions = [
  "Automation / AI Implementation",
  "Workshop / Training",
  "Consulting / Strategy",
  "Other",
];

const improvementAreas = [
  "Lead Generation",
  "Customer Support",
  "Internal Ops",
  "Data Processing",
  "Content / Marketing Workflows",
  "Not Sure Yet",
];

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    preferredContact: "",
    service: "",
    message: "",
  });
  const [improvements, setImprovements] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleImprovement = (area: string) => {
    setImprovements((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, improvements }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or book a call directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-12 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="mt-6 font-[family-name:var(--font-rajdhani)] text-2xl font-bold">
                  Message sent!
                </h3>
                <p className="mt-2 max-w-sm text-text-secondary">
                  We&apos;ll get back to you within 24 hours. If you&apos;d like
                  to skip the wait, book a call directly.
                </p>
                <a
                  href="https://calendly.com/chandler-syntriclabs/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary-lighter transition-colors hover:text-primary"
                >
                  Book a Call Instead
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-6"
              >
                {/* Name + Email */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>

                {/* Phone + Company */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Company
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={form.company}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                {/* Preferred Contact + Service */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preferredContact" className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Preferred Contact Method
                    </label>
                    <div className="flex gap-2">
                      {contactMethods.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, preferredContact: m.value }))}
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            form.preferredContact === m.value
                              ? "border-primary bg-primary/10 text-primary-lighter"
                              : "border-border bg-bg-primary text-text-secondary hover:border-border-hover"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="service" className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Service Interested In
                    </label>
                    <select
                      id="service"
                      name="service"
                      value={form.service}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      <option value="">Select...</option>
                      {serviceOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Improvement areas */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-secondary">
                    What are you hoping to improve?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {improvementAreas.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleImprovement(area)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          improvements.includes(area)
                            ? "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan"
                            : "border-border bg-bg-primary text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    minLength={10}
                    rows={4}
                    value={form.message}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                    placeholder="Tell us a bit about your business and what you're looking to solve..."
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-light disabled:opacity-50 btn-shimmer"
                >
                  {submitting ? "Sending..." : "Send Message"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
