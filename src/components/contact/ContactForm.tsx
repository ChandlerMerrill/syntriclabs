"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";

const contactMethods = [
  { label: "Email", value: "Email" },
  { label: "Phone", value: "Phone" },
  { label: "Text Message", value: "SMS" },
];

const serviceOptions = [
  "Automation/Ai Implementation",
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleImprovement = (area: string) => {
    setImprovements((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        "https://entronexus.app.n8n.cloud/webhook/syntric-contact-form",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, improvements }),
        },
      );

      if (!res.ok) throw new Error("Failed to send");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyles =
    "w-full rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-near-black placeholder:text-gray-400 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10";

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-2xl border border-green-100 bg-green-50/50 py-16 text-center"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-near-black">
            Thanks for reaching out!
          </h3>
          <p className="mt-2 text-gray-500">
            We&apos;ll be in touch within 24 hours.
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Name <span className="text-primary">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                className={inputStyles}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Email <span className="text-primary">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className={inputStyles}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="company"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={form.company}
                onChange={handleChange}
                placeholder="Your company name"
                className={inputStyles}
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className={inputStyles}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="service"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Service interested in
              </label>
              <select
                id="service"
                name="service"
                value={form.service}
                onChange={handleChange}
                className={inputStyles}
              >
                <option value="">Select a service...</option>
                {serviceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="preferredContact"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                How should we contact you?
              </label>
              <select
                id="preferredContact"
                name="preferredContact"
                value={form.preferredContact}
                onChange={handleChange}
                className={inputStyles}
              >
                <option value="">Select a method...</option>
                {contactMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="mb-3 block text-xs font-medium uppercase tracking-wide text-gray-500">
              What are you hoping to improve?
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {improvementAreas.map((area) => (
                <label
                  key={area}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-all select-none ${
                    improvements.includes(area)
                      ? "border-primary/30 bg-primary/5 text-near-black"
                      : "border-gray-200 bg-gray-50/60 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={improvements.includes(area)}
                    onChange={() => toggleImprovement(area)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      improvements.includes(area)
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {improvements.includes(area) && (
                      <svg
                        viewBox="0 0 12 12"
                        className="h-2.5 w-2.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2.5 6l2.5 2.5 4.5-5" />
                      </svg>
                    )}
                  </span>
                  {area}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="message"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Message <span className="text-primary">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              value={form.message}
              onChange={handleChange}
              minLength={10}
              placeholder="Tell us a bit about what you're looking for — a project, a question, a consultation, etc."
              className={`${inputStyles} resize-none`}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? "Sending..." : "Send message"}
            {!submitting && (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
