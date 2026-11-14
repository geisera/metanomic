import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contact", description: "Start a conversation about AI consulting, custom agents, and business automation with Metanomic." };

export default function ContactPage() {
  return <main className="grid-lines min-h-screen">
    <header className="container flex items-center justify-between border-b border-[#33444c] py-7">
      <Link href="/" className="text-xl font-semibold tracking-[-.05em]">metanomic<span className="text-[#c9ec8a]">.</span></Link>
      <Link href="/" className="navlink">← Back to home</Link>
    </header>
    <section className="container py-24 md:py-36">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-6 max-w-[800px] text-5xl font-semibold tracking-[-.065em] md:text-7xl">Let&apos;s build something <span className="text-[#c9ec8a]">useful.</span></h1>
      <p className="muted mt-8 max-w-[640px] text-lg leading-8">Whether you&apos;re exploring AI for the first time or ready to develop a custom agent, we&apos;d like to understand what you&apos;re working toward.</p>
      <div className="card mt-12 max-w-[680px]">
        <h2 className="text-xl font-semibold">Start a conversation</h2>
        <p className="muted mt-4 text-sm leading-7">Our inquiry form is being prepared. In the meantime, please return to the homepage for an overview of our services.</p>
        <Link href="/" className="button button-outline mt-7">Explore Metanomic <span aria-hidden>↗</span></Link>
      </div>
    </section>
  </main>;
}
