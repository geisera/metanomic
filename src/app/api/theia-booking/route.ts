import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createCalendlyBooking, validBookingRequest } from "@/lib/calendly-booking";

export const runtime = "nodejs";
export const maxDuration = 40;
export const dynamic = "force-dynamic";

const RATE_WINDOW = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();
// Best-effort per-instance duplicate protection; cross-instance safety comes
// from Calendly's availability checks. Do not mistake this for a shared lock.
const bookingLocks = new Map<string, number>();

function json(data: object, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function allowAttempt(ip: string): boolean {
  const now = Date.now();
  if (attempts.size > 1200) {
    for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
  }
  const old = attempts.get(ip);
  const next = !old || old.resetAt <= now
    ? { count: 1, resetAt: now + RATE_WINDOW }
    : { count: old.count + 1, resetAt: old.resetAt };
  attempts.set(ip, next);
  return next.count <= MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ status: "invalid", message: "Booking requests must come from the Metanomic website." }, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ status: "invalid", message: "Expected a JSON booking request." }, 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 4096) {
    return json({ status: "invalid", message: "Request is too long." }, 413);
  }

  let payload: Record<string, unknown> | null = null;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ status: "invalid", message: "Request is too long." }, 413);
    payload = record(JSON.parse(raw));
  } catch {
    return json({ status: "invalid", message: "Invalid booking request." }, 400);
  }
  if (!payload || payload.confirmed !== true || !validBookingRequest(payload)) {
    return json({ status: "invalid", message: "Select an available time, enter your name and email, and confirm the booking." }, 400);
  }
  if (payload.website) {
    return json({ status: "invalid", message: "Booking was not submitted." }, 400);
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const publicKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (!secret || !publicKey || !process.env.CALENDLY_PERSONAL_ACCESS_TOKEN?.trim()) {
    return json({ status: "not_configured", message: "Direct booking is temporarily unavailable. Please use Calendly." }, 503);
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowAttempt(ip)) {
    return json({ status: "limit", message: "Too many booking attempts. Please use Calendly directly or try again later." }, 429);
  }

  const challengeToken = payload.turnstileToken;
  if (typeof challengeToken !== "string" || !challengeToken || challengeToken.length > 2048) {
    return json({ status: "verification_failed", message: "Please complete the security check before confirming." }, 403);
  }
  try {
    const verified = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: challengeToken, remoteip: ip }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!verified.ok) throw new Error("turnstile_http_" + verified.status);
    const validation = record(await verified.json());
    if (!validation || validation.success !== true ||
      validation.action !== "book_meeting" || validation.hostname !== request.nextUrl.hostname) {
      return json({ status: "verification_failed", message: "Security verification failed or expired. Please try again." }, 403);
    }
  } catch {
    return json({ status: "verification_unavailable", message: "Security verification is unavailable. Please use Calendly." }, 503);
  }

  const bookingKey = createHash("sha256").update([
    (payload.email as string).toLowerCase().trim(),
    payload.eventTypeUri,
    payload.startTime,
  ].join("|")).digest("hex");

  const now = Date.now();
  if (bookingLocks.size > 800) {
    for (const [key, until] of bookingLocks) if (until <= now) bookingLocks.delete(key);
  }
  const existing = bookingLocks.get(bookingKey);
  if (existing && existing > now) {
    return json({
      status: "duplicate",
      message: "This booking was already submitted recently. Check your inbox before trying again.",
    }, 409);
  }
  bookingLocks.set(bookingKey, now + 30 * 60_000);

  const outcome = await createCalendlyBooking({
    name: (payload.name as string).trim(),
    email: (payload.email as string).trim(),
    eventTypeUri: payload.eventTypeUri as string,
    startTime: payload.startTime as string,
    timeZone: payload.timeZone as string,
  });

  if (outcome.status !== "confirmed" && outcome.status !== "uncertain") {
    bookingLocks.delete(bookingKey);
  }

  const status = outcome.status === "confirmed" ? 200
    : outcome.status === "not_available" || outcome.status === "unsupported" ? 409
    : outcome.status === "auth_error" || outcome.status === "not_configured" ? 503
    : 502;

  return json(outcome, status);
}
