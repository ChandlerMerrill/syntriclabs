"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

const serviceOptions = [
  "AI Chat Agent",
  "AI Voice Agent",
  "Workshop / Training",
  "Consulting / Strategy",
  "Other",
];

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitting(false);
    setSubmitted(true);
  };

  const inputStyles =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-near-black placeholder:text-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10";

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
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-semibold text-near-black"
              >
                Name
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
                className="mb-1.5 block text-sm font-semibold text-near-black"
              >
                Email
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

          <div>
            <label
              htmlFor="company"
              className="mb-1.5 block text-sm font-semibold text-near-black"
            >
              Company{" "}
              <span className="font-normal text-gray-400">(optional)</span>
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
              htmlFor="service"
              className="mb-1.5 block text-sm font-semibold text-near-black"
            >
              Service interested in{" "}
              <span className="font-normal text-gray-400">(optional)</span>
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
              htmlFor="message"
              className="mb-1.5 block text-sm font-semibold text-near-black"
            >
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              value={form.message}
              onChange={handleChange}
              placeholder="Tell us about your project or what you're looking to automate..."
              className={`${inputStyles} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:shadow-none sm:w-auto"
          >
            {submitting ? "Sending..." : "Send message"}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
