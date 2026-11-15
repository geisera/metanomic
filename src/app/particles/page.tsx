import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/ParticlePlaygroundLink.module.css";

export const metadata: Metadata = {
  title: "Particle Playground",
  description: "A distraction-free space to play with Metanomic’s interactive particles.",
  alternates: { canonical: "/particles" },
};

// The root layout already supplies the interactive particle canvas.
// Stop touch drags from scrolling the page while keeping a quiet route home.
export default function ParticlePlayground() {
  return <main aria-label="Interactive particle playground" className="fixed inset-0 touch-none overflow-hidden">
    <h1 className="sr-only">Particle playground</h1>
    <Link href="/" className={styles.link}>← Home</Link>
  </main>;
}
