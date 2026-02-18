"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface CallbackFormProps {
  onSubmit?: (data: { name: string; phone: string; topic: string }) => void;
}

export default function CallbackForm({ onSubmit }: CallbackFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    if (onSubmit) {
      onSubmit({ name, phone, topic });
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/vapi/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), topic: topic.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="font-bold text-near-black">Call requested!</p>
          <p className="mt-1 text-sm text-gray-500">
            Our AI voice agent will call you at{" "}
            <span className="font-medium text-near-black">{phone}</span>{" "}
            within moments.
          </p>
        </div>
        <button
          onClick={() => {
            setStatus("idle");
            setName("");
            setPhone("");
            setTopic("");
          }}
          className="mt-2 text-sm font-semibold text-primary hover:text-primary-light transition-colors"
        >
          Request another call
        </button>
      </div>
    );
  }

  const disabled = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-near-black">
          Name
        </label>
        <input
          id="callback-name"
          name="name"
          autoComplete="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mark Thompson"
          required
          disabled={disabled}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-near-black placeholder:text-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-near-black">
          Phone Number
        </label>
        <input
          id="callback-phone"
          name="phone"
          autoComplete="tel"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          required
          disabled={disabled}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-near-black placeholder:text-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-near-black">
          Topic / Reason{" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Voice agent services"
          disabled={disabled}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-near-black placeholder:text-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
        />
      </div>

      {status === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
      >
        {disabled ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Requesting call...
          </>
        ) : (
          "Request a callback"
        )}
      </button>
    </form>
  );
}
