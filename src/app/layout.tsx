import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TheiaConversationProvider } from "@/components/TheiaConversation";
import TheiaDock from "@/components/TheiaDock";
import IntelligenceVisual from "@/components/IntelligenceVisual";

const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" });

export const metadata: Metadata = {
  metadataBase: new URL("https://metanomic.ai"),
  title: { default: "Metanomic | AI That Magnifies Human Impact", template: "%s | Metanomic" },
  description: "Metanomic builds practical AI tools, custom agents, and intelligent workflows that expand human capability and magnify the impact of people's work.",
  openGraph: {
    title: "Metanomic — AI That Magnifies Human Impact",
    description: "AI agents, automations, and connected tools designed to amplify what people can achieve.",
    url: "https://metanomic.ai",
    siteName: "Metanomic",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={geist.variable}><IntelligenceVisual /><TheiaConversationProvider><TheiaDock><div className="relative z-10">{children}</div></TheiaDock></TheiaConversationProvider></body></html>;
}
