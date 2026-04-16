"use client"

import { Input } from "@/components/ui/input"

interface CurrencyInputProps {
  value: number | null
  onChange: (cents: number | null) => void
  placeholder?: string
}

export default function CurrencyInput({ value, onChange, placeholder = "$0" }: CurrencyInputProps) {
  const displayValue = value != null ? (value / 100).toFixed(0) : ""

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "")
    if (raw === "") {
      onChange(null)
    } else {
      onChange(parseInt(raw, 10) * 100)
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">$</span>
      <Input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-white/8 bg-[#0B1120] pl-7 text-white placeholder:text-[#94A3B8]/50"
      />
    </div>
  )
}
