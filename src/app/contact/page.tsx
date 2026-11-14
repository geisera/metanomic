import type { Metadata } from "next";
import Link from "next/link";

const CALENDLY_URL = "https://calendly.com/metanomic";

export const metadata: Metadata = {
  title: "Schedule a Conversation",
  description: "Schedule a conversation with Metanomic about practical AI agents, workflow automation, and enterprise AI solutions.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Schedule a Conversation | Metanomic",
    description: "Book a conversation with Metanomic to discuss your team's AI opportunities.",
    url: "https://metanomic.ai/contact",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <main className="grid-lines min-h-screen">
      <header className="container flex items-center justify-between border-b border-[#33444c] py-7">
        <Link href="/" className="rounded-md text-xl font-semibold tracking-[-.05em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]">
          metanomic<span className="text-[#c9ec8a]">.</span>
        </Link>
        <Link href="/" className="navlink rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]">← Back to home</Link>
      </header>

      <section className="container pb-20 pt-16 md:pb-28 md:pt-24">
        <p className="eyebrow">Let's talk</p>
        <h1 className="mt-5 max-w-[800px] text-4xl font-semibold tracking-[-.06em] sm:text-5xl md:text-6xl">
          Let's discuss <span className="text-[#c9ec8a]">what AI can do for you.</span>
        </h1>
        <p className="muted mt-6 max-w-[720px] text-base leading-8 sm:text-lg">
          Tell us about your business challenge. Choose a time below to discuss a practical AI solution with Metanomic.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-[#d6e5dd]">Schedule directly on this page, or</p>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[#c9ec8a] underline underline-offset-4 hover:text-[#e5f9c4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"
          >
            Open Calendly <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="-mx-[18px] mt-7 overflow-hidden border-y border-[#324750] bg-white sm:mx-0 sm:rounded-xl sm:border">
          <iframe
            title="Book a conversation with Metanomic using Calendly"
            src={CALENDLY_URL}
            loading="lazy"
            className="block h-[900px] w-full border-0 sm:h-[780px]"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className="mt-4 text-xs leading-6 text-[#b9cac4]">
          Scheduling is provided by Calendly. Information you enter in the booking form is processed by Calendly.
        </p>
      </section>
    </main>
  );
}
