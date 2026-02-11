"use client";

import { useState } from "react";

interface CallbackFormProps {
  onSubmit: (data: { name: string; phone: string; topic: string }) => void;
  disabled?: boolean;
}

export default function CallbackForm({ onSubmit, disabled }: CallbackFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSubmit({ name, phone, topic });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-near-black">
          Name
        </label>
        <input
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
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
      >
        {disabled ? "Call in progress..." : "Request a callback"}
      </button>
    </form>
  );
}
