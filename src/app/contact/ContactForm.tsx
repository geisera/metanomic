"use client";

import { useRef, useState, type FormEvent } from "react";

type SubmissionState = "idle" | "sending" | "success" | "error";

const inputClass = "mt-2 block min-h-12 w-full rounded-lg border border-[#52676d] bg-[#0b1922] px-4 py-3 text-base text-[#f0f6ef] placeholder:text-[#aabeb9] focus:border-[#c9ec8a] focus:outline-2 focus:outline-offset-2 focus:outline-[#c9ec8a] disabled:opacity-60";
const labelClass = "block text-sm font-medium text-[#e3ede7]";

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

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
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={event => void submit(event)}
      aria-label="Contact Metanomic"
      className="rounded-xl border border-[#34504f] bg-[#102029]/95 p-5 shadow-[0_14px_45px_rgba(0,0,0,.15)] sm:p-8"
    >
      <h2 className="text-2xl font-semibold tracking-[-.04em] text-[#eff6ef]">Send us a message</h2>
      <p className="mt-2 text-sm leading-6 text-[#c3d5cd]">
        Tell us a little about what you're looking to accomplish.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>Name <span aria-hidden="true" className="text-[#c9ec8a]">*</span></label>
          <input id="contact-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100}
            placeholder="Your name" className={inputClass} disabled={status === "sending"} />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>Email <span aria-hidden="true" className="text-[#c9ec8a]">*</span></label>
          <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254}
            placeholder="you@company.com" className={inputClass} disabled={status === "sending"} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-company" className={labelClass}>Company <span className="font-normal text-[#b6c9c0]">(optional)</span></label>
        <input id="contact-company" name="company" type="text" autoComplete="organization" maxLength={120}
          placeholder="Your organization" className={inputClass} disabled={status === "sending"} />
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className={labelClass}>What can we help you with? <span aria-hidden="true" className="text-[#c9ec8a]">*</span></label>
        <textarea id="contact-message" name="message" required minLength={20} maxLength={3000} rows={5}
          placeholder="Describe your challenge, idea, or goals…"
          className={inputClass + " min-h-[150px] resize-y"}
          disabled={status === "sending"} />
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input type="text" id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="mt-5 text-xs leading-6 text-[#c1d1ca]">
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
            ? "mt-5 rounded-lg border border-[#986e55] bg-[#36251c] px-4 py-3 text-sm text-[#f6d7c1]"
            : "mt-5 rounded-lg border border-[#628365] bg-[#18382b] px-4 py-3 text-sm text-[#d9f1d4]"}
        >
          {feedback}
        </p>
      )}
    </form>
  );
}
