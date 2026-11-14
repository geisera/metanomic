import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SUBMISSIONS = 5;
const limits = new Map<string, { count: number; resetAt: number }>();

function respond(message: string, status: number) {
  return NextResponse.json({ message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function limitSubmission(ip: string) {
  const now = Date.now();
  if (limits.size > 1000) {
    for (const [key, value] of limits) {
      if (value.resetAt <= now) limits.delete(key);
    }
    if (limits.size > 1500) limits.clear();
  }
  const existing = limits.get(ip);
  const next = !existing || existing.resetAt <= now
    ? { count: 1, resetAt: now + WINDOW_MS }
    : { count: existing.count + 1, resetAt: existing.resetAt };
  limits.set(ip, next);
  return next.count <= MAX_SUBMISSIONS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function field(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length > max + 100) return null;
  const clean = value.replace(/\r\n?/g, "\n").trim();
  return clean.length <= max ? clean : null;
}

function emailValid(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n]/.test(email);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return respond("Request origin not allowed.", 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return respond("Expected a JSON submission.", 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 8192) {
    return respond("Your message is too long.", 413);
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 8192) return respond("Your message is too long.", 413);
    payload = JSON.parse(raw);
  } catch {
    return respond("Please check your form and try again.", 400);
  }
  if (!isRecord(payload)) return respond("Please check your form and try again.", 400);

  // A hidden field catches simple form-filling bots; do not acknowledge spam.
  if (payload.website) return respond("Message received.", 200);

  const name = field(payload.name, 100);
  const email = field(payload.email, 254);
  const company = field(payload.company ?? "", 120);
  const message = field(payload.message, 3000);

  if (!name || name.length < 2 || name.includes("\n") ||
      !email || !emailValid(email) ||
      company === null || company.includes("\n") ||
      !message || message.length < 20) {
    return respond("Enter your name, a valid email address, and a message of at least 20 characters.", 400);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!limitSubmission(ip)) {
    return respond("Too many messages have been sent. Please try again later.", 429);
  }

  // Require both configured Turnstile keys, or neither during setup.
  // In production, enable both together before relying on bot protection.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (siteKey || secret) {
    if (!siteKey || !secret) {
      console.error("Contact form: Turnstile keys are not both configured.");
      return respond("Contact verification is temporarily unavailable. Please try again later.", 503);
    }

    const token = field(payload.turnstileToken, 2048);
    if (!token) return respond("Please complete the security check and try again.", 400);

    try {
      const challenge = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!challenge.ok) {
        console.error("Contact form: Turnstile Siteverify returned status", challenge.status);
        return respond("Security verification is unavailable. Please try again later.", 503);
      }
      const result: unknown = await challenge.json();
      // Bind the token to this site's hostname and this form's action.
      if (!isRecord(result) || result.success !== true ||
          result.action !== "contact" || result.hostname !== request.nextUrl.hostname) {
        return respond("Security verification failed or expired. Please try again.", 403);
      }
    } catch {
      console.error("Contact form: Turnstile verification request failed.");
      return respond("Security verification is unavailable. Please try again later.", 503);
    }
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!key || !to || !from) {
    console.error("Contact form: email delivery is not configured.");
    return respond("We're unable to accept messages right now. Please try again later.", 503);
  }

  const body = [
    "New Metanomic website inquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || "(not provided)"}`,
    "",
    "Message:",
    message,
    "",
    "Submitted through https://metanomic.ai/contact",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: "New inquiry from Metanomic website",
        text: body,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Contact form: email provider returned status", response.status);
      return respond("Your message could not be sent. Please try again later.", 502);
    }
    return respond("Thank you. Your message has been sent.", 200);
  } catch {
    console.error("Contact form: email provider request failed.");
    return respond("Your message could not be sent. Please try again later.", 502);
  }
}
