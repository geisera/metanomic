"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type TurnstileAPI = {
  render: (container: HTMLElement, options: {
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
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileAPI };

type SubmissionState = "idle" | "sending" | "success" | "error";

const inputClass = "mt-2 block min-h-12 w-full rounded-lg border border-[var(--site-52676d)] bg-[var(--site-0b1922)] px-4 py-3 text-base text-[var(--site-f0f6ef)] placeholder:text-[var(--site-aabeb9)] focus:border-[#c9ec8a] focus:outline-2 focus:outline-offset-2 focus:outline-[#c9ec8a] disabled:opacity-60";
const labelClass = "block text-sm font-medium text-[var(--site-e3ede7)]";

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [challengeError, setChallengeError] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !scriptReady || !widgetContainerRef.current) return;
    const api = (window as TurnstileWindow).turnstile;
    if (!api) return;

    const widgetId = api.render(widgetContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      size: "flexible",
      appearance: "interaction-only",
      action: "contact",
      callback: token => {
        setTurnstileToken(token);
        setChallengeError(false);
      },
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => {
        setTurnstileToken("");
        setChallengeError(true);
      },
      "timeout-callback": () => setTurnstileToken(""),
    });
    widgetIdRef.current = widgetId;

    return () => {
      api.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [scriptReady]);
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setStatus("error");
      setFeedback("Please complete the security check before sending your message.");
      return;
    }

    const form = event.currentTarget;
    const fields = new FormData(form);
    setStatus("sending");
    setFeedback("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          email: fields.get("email"),
          company: fields.get("company"),
          message: fields.get("message"),
          website: fields.get("website"),
          turnstileToken: TURNSTILE_SITE_KEY ? turnstileToken : undefined,
        }),
      });
      const result: { message?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Your message could not be sent. Please try again.");
      }
      formRef.current?.reset();
      setStatus("success");
      setFeedback("Your message has been sent. We'll be in touch.");
    } catch (cause) {
      setStatus("error");
      setFeedback(cause instanceof Error ? cause.message : "Your message could not be sent. Please try again.");
    } finally {
      // Turnstile tokens are single-use; refresh after every attempted submission.
      if (TURNSTILE_SITE_KEY) {
        setTurnstileToken("");
        const api = (window as TurnstileWindow).turnstile;
        if (api && widgetIdRef.current) api.reset(widgetIdRef.current);
      }
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={event => void submit(event)}
      aria-label="Contact Metanomic"
      className="rounded-xl border border-[var(--site-34504f)] bg-[var(--site-102029)]/95 p-5 shadow-[0_14px_45px_rgba(0,0,0,.15)] sm:p-8"
    >
      <h2 className="text-2xl font-semibold tracking-[-.04em] text-[var(--site-eff6ef)]">Send us a message</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--site-c3d5cd)]">
        Tell us a little about what you're looking to accomplish.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>Name <span aria-hidden="true" className="text-[var(--site-c9ec8a)]">*</span></label>
          <input id="contact-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100}
            placeholder="Your name" className={inputClass} disabled={status === "sending"} />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>Email <span aria-hidden="true" className="text-[var(--site-c9ec8a)]">*</span></label>
          <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254}
            placeholder="you@company.com" className={inputClass} disabled={status === "sending"} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-company" className={labelClass}>Company <span className="font-normal text-[var(--site-b6c9c0)]">(optional)</span></label>
        <input id="contact-company" name="company" type="text" autoComplete="organization" maxLength={120}
          placeholder="Your organization" className={inputClass} disabled={status === "sending"} />
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className={labelClass}>What can we help you with? <span aria-hidden="true" className="text-[var(--site-c9ec8a)]">*</span></label>
        <textarea id="contact-message" name="message" required minLength={20} maxLength={3000} rows={5}
          placeholder="Describe your challenge, idea, or goals…"
          className={inputClass + " min-h-[150px] resize-y"}
          disabled={status === "sending"} />
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input type="text" id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {TURNSTILE_SITE_KEY && (
        <div className="mt-5" aria-label="Security verification">
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={() => setScriptReady(true)}
            onError={() => setChallengeError(true)}
          />
          <div ref={widgetContainerRef} className="min-h-0 max-w-full" />
          {challengeError && (
            <p role="status" className="mt-2 text-sm text-[var(--site-f2d2af)]">
              The security check could not load. Please refresh this page and try again.
            </p>
          )}
        </div>
      )}

      <p className="mt-5 text-xs leading-6 text-[var(--site-c1d1ca)]">
        We'll use your details to respond. Don't include sensitive information. Email delivery is handled by a third-party provider.
      </p>

      <button
        type="submit"
        disabled={status === "sending"}
        className="button button-primary mt-5 w-full min-h-12 sm:w-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a] disabled:cursor-wait disabled:opacity-70"
      >
        {status === "sending" ? "Sending…" : "Send message"}
        {status !== "sending" && <span aria-hidden="true">↗</span>}
      </button>

      {feedback && (
        <p
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={status === "error"
            ? "mt-5 rounded-lg border border-[var(--site-986e55)] bg-[var(--site-36251c)] px-4 py-3 text-sm text-[var(--site-f6d7c1)]"
            : "mt-5 rounded-lg border border-[var(--site-628365)] bg-[var(--site-18382b)] px-4 py-3 text-sm text-[var(--site-d9f1d4)]"}
        >
          {feedback}
        </p>
      )}
    </form>
  );
}
