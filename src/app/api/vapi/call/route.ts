import { NextResponse } from "next/server";

function toE164(raw: string): string {
  const trimmed = raw.trim();

  // If user already provided +E.164, keep it (strip spaces/dashes/etc but preserve +)
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/\D/g, "");
  }

  // Otherwise, normalize to digits and assume US default if 10 digits
  const digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;

  // Fallback: best-effort
  return `+${digits}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  if (!apiKey || !phoneNumberId || !assistantId) {
    return NextResponse.json(
      { error: "Voice agent is not configured yet. Please check back soon." },
      { status: 503 },
    );
  }

  let body: { name?: string; phone?: string; topic?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { name, phone, topic } = body;

  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json(
      { error: "Name and phone number are required." },
      { status: 400 },
    );
  }

  const customerNumber = toE164(phone);

  try {
    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: { number: customerNumber },
        metadata: {
          customerName: name.trim(),
          ...(topic?.trim() ? { topic: topic.trim() } : {}),
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Vapi API error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to initiate call. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Vapi API request failed:", err);
    return NextResponse.json(
      { error: "Failed to reach voice service. Please try again." },
      { status: 502 },
    );
  }
}
