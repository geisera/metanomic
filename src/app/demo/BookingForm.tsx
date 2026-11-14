"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AvailableSlot } from "@/lib/calendly";
import type { BookingOutcome } from "@/lib/calendly-booking";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type TurnstileAPI = {
  render: (element: HTMLElement, options: {
    sitekey: string;
    theme: "dark";
    size: "flexible";
    appearance: "interaction-only";
    action: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    "timeout-callback": () => void;
  }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

type Props = {
  slot: AvailableSlot;
  eventType: string;
  eventTypeUri: string;
  timeZone: string;
  onCancel: () => void;
};

const inputStyle = "mt-1.5 block min-h-11 w-full rounded-lg border border-[#5c7971] bg-[#0a1c24] px-3 py-2 text-base text-[#f2f8f1] placeholder:text-[#aabfb4] focus:border-[#c9ec8a] focus:outline-2 focus:outline-offset-2 focus:outline-[#c9ec8a] disabled:opacity-60";

export default function BookingForm({ slot, eventType, eventTypeUri, timeZone, onCancel }: Props) {
  const captchaNodeRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const [status, setStatus] = useState<"ready" | "sending" | "confirmed" | "uncertain">("ready");
  const [error, setError] = useState("");
  const [result, setResult] = useState<BookingOutcome | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !scriptReady || !captchaNodeRef.current) return;
    const api = (window as Window & { turnstile?: TurnstileAPI }).turnstile;
    if (!api) return;
    const id = api.render(captchaNodeRef.current, {
      sitekey: SITE_KEY,
      theme: "dark",
      size: "flexible",
      appearance: "interaction-only",
      action: "book_meeting",
      callback: value => { setToken(value); setCaptchaError(false); },
      "expired-callback": () => setToken(""),
      "error-callback": () => { setToken(""); setCaptchaError(true); },
      "timeout-callback": () => setToken(""),
    });
    widgetId.current = id;
    return () => {
      api.remove(id);
      widgetId.current = null;
    };
  }, [scriptReady]);

  function resetChallenge() {
    setToken("");
    const api = (window as Window & { turnstile?: TurnstileAPI }).turnstile;
    if (api && widgetId.current) api.reset(widgetId.current);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || status !== "ready") return;
    if (!token) {
      setError("Complete the security check before confirming the appointment.");
      return;
    }
    const fields = new FormData(event.currentTarget);
    if (fields.get("confirm") !== "yes") {
      setError("Please confirm that you want to schedule this appointment.");
      return;
    }

    inFlight.current = true;
    setStatus("sending");
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 38_000);
    try {
      const response = await fetch("/api/theia-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeUri,
          startTime: slot.startTime,
          timeZone,
          name: fields.get("name"),
          email: fields.get("email"),
          confirmed: true,
          turnstileToken: token,
          website: fields.get("website"),
        }),
        signal: controller.signal,
      });
      const data = await response.json() as BookingOutcome;
      if (response.ok && data.status === "confirmed") {
        setResult(data);
        setStatus("confirmed");
      } else if (data.status === "uncertain" || data.status === "duplicate") {
        setResult(data);
        setStatus("uncertain");
      } else {
        setError(data.message || "Booking could not be completed. Please use Calendly.");
        setStatus("ready");
        resetChallenge();
      }
    } catch {
      setResult({
        status: "uncertain",
        message: "The booking response was interrupted. Please check your email before attempting another booking.",
        bookingUrl: slot.bookingUrl,
      });
      setStatus("uncertain");
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
    }
  }

  if (status === "confirmed") {
    return (
      <div role="status" className="mt-4 rounded-xl border border-[#739d70] bg-[#163d30] p-4">
        <p className="text-base font-semibold text-[#e5f7d4]">Appointment confirmed</p>
        <p className="mt-2 text-sm text-[#e0f0e4]">{eventType} — {slot.label}</p>
        <p className="mt-1 text-sm text-[#cbdcd0]">{result?.message}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {result?.rescheduleUrl && (
            <a href={result.rescheduleUrl} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-[#c9ec8a] underline underline-offset-4">Reschedule ↗</a>
          )}
          {result?.cancelUrl && (
            <a href={result.cancelUrl} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-[#c9ec8a] underline underline-offset-4">Cancel appointment ↗</a>
          )}
        </div>
      </div>
    );
  }

  if (status === "uncertain") {
    return (
      <div role="alert" className="mt-4 rounded-xl border border-[#b18a54] bg-[#31291e] p-4">
        <p className="font-semibold text-[#ffe7af]">Booking status needs verification</p>
        <p className="mt-2 text-sm text-[#f1dfbb]">{result?.message}</p>
        <a href={slot.bookingUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#c9ec8a] underline underline-offset-4">
          Open Calendly ↗
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={event => void confirm(event)}
      className="mt-4 rounded-xl border border-[#658a71] bg-[#172f2c] p-4"
      aria-label="Confirm your Calendly booking">
      <h3 className="text-base font-semibold text-[#e7f8d8]">Confirm your appointment</h3>
      <p className="mt-2 text-sm text-[#dae9df]">{eventType} — <strong>{slot.label}</strong></p>
      <p className="mt-1 text-xs text-[#bcd3c2]">Time zone: {timeZone}. Your slot is not reserved until Calendly confirms it.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[#eaf5e7]" htmlFor="theia-booking-name">Full name</label>
          <input id="theia-booking-name" name="name" type="text" required minLength={2} maxLength={100}
            autoComplete="name" placeholder="Your full name" className={inputStyle} disabled={status === "sending"} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#eaf5e7]" htmlFor="theia-booking-email">Email</label>
          <input id="theia-booking-email" name="email" type="email" required maxLength={254}
            autoComplete="email" placeholder="you@company.com" className={inputStyle} disabled={status === "sending"} />
        </div>
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="theia-booking-website">Leave this blank</label>
        <input id="theia-booking-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {SITE_KEY ? (
        <div className="mt-4">
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive" onReady={() => setScriptReady(true)}
            onError={() => setCaptchaError(true)} />
          <div ref={captchaNodeRef} />
          {captchaError && <p role="alert" className="mt-2 text-sm text-[#f1cfaa]">
            The security check couldn't load. Please use Calendly instead.
          </p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#f1cfaa]">Direct booking is unavailable. Please use Calendly.</p>
      )}

      <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-[#e1efe3]">
        <input type="checkbox" name="confirm" value="yes" required disabled={status === "sending"}
          className="mt-1.5 h-4 w-4 shrink-0 accent-[#c9ec8a]" />
        <span>I authorize Metanomic to schedule this appointment using my details. Calendly will process the booking and send the invitation.</span>
      </label>
      <p className="mt-3 text-xs leading-5 text-[#bdd1c4]">
        Your contact information goes directly to Calendly for scheduling, not into Theia's AI conversation.
      </p>

      {error && <p role="alert" className="mt-3 text-sm text-[#ffd2ad]">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={status === "sending" || !SITE_KEY}
          className="inline-flex min-h-11 items-center rounded-lg bg-[#c9ec8a] px-4 font-semibold text-[#112026] hover:bg-[#dcf7af] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a] disabled:cursor-wait disabled:opacity-60">
          {status === "sending" ? "Confirming with Calendly…" : "Confirm booking"}
        </button>
        <button type="button" onClick={onCancel} disabled={status === "sending"}
          className="inline-flex min-h-11 items-center rounded-lg border border-[#799485] px-4 font-semibold text-[#e0ede2] hover:bg-[#25453c] disabled:opacity-60">
          Back
        </button>
        <a href={slot.bookingUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[#c9ec8a] underline underline-offset-4">
          Book on Calendly instead ↗
        </a>
      </div>
    </form>
  );
}
