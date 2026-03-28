import { NextRequest, NextResponse } from "next/server";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("1") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.startsWith("+")) {
    return phone.replace(/[^\d+]/g, "");
  }

  return `+${digits}`;
}

export async function POST(request: NextRequest) {
  try {
    const { name, phone, topic } = await request.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.VAPI_API_KEY;
    const assistantId = process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!apiKey || !assistantId || !phoneNumberId) {
      return NextResponse.json(
        { error: "Voice agent is not configured" },
        { status: 500 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: { number: normalizedPhone },
        metadata: {
          customerName: name,
          ...(topic && { topic }),
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to initiate call" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, callId: data.id });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
