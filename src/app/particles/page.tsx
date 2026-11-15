import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Particle Playground",
  description: "A distraction-free space to play with Metanomic’s interactive particles.",
  alternates: { canonical: "/particles" },
};

// The root layout already supplies the interactive particle canvas.
// Keep this surface empty and stop touch drags from scrolling the page.
export default function ParticlePlayground() {
  return <main aria-label="Interactive particle playground" className="fixed inset-0 touch-none overflow-hidden">
    <h1 className="sr-only">Particle playground</h1>
  </main>;
}
