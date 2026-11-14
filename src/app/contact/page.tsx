import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";

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
          Tell us about your business challenge, or schedule a conversation to explore practical AI solutions with Metanomic.
        </p>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
          <ContactForm />
          <aside className="rounded-xl border border-[#31494b] bg-[#102029]/90 p-7 sm:p-8">
            <p className="eyebrow">Prefer to talk?</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-.04em]">Let's find a time.</h2>
            <p className="muted mt-4 text-sm leading-7">
              Choose a convenient time for a conversation about your goals and where AI could help.
            </p>
            <a
              href="https://calendly.com/metanomic"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[#c9ec8a] underline underline-offset-4 hover:text-[#e5f9c4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"
            >
              Open Calendly <span aria-hidden="true">↗</span>
            </a>
            <p className="mt-3 text-xs leading-6 text-[#b9cac4]">Opens in a new tab.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
