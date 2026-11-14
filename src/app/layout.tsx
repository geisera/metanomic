import type { Metadata } from "next";
import "./globals.css";
import IntelligenceVisual from "@/components/IntelligenceVisual";

export const metadata: Metadata = {
  metadataBase: new URL("https://metanomic.ai"),
  title: { default: "Metanomic | Human Purpose. Intelligent Execution.", template: "%s | Metanomic" },
  description: "Metanomic designs and builds practical AI agents, intelligent workflows, and integrated systems for growing businesses.",
  openGraph: {
    title: "Metanomic — Human Purpose. Intelligent Execution.",
    description: "AI strategy, custom agents, and intelligent systems thoughtfully built for people.",
    url: "https://metanomic.ai",
    siteName: "Metanomic",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><IntelligenceVisual /><div className="relative z-10">{children}</div></body></html>;
}
