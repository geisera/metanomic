import type { Metadata } from "next";
import KnowledgeManager from "./KnowledgeManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Theia Knowledge Administration",
  description: "Private Metanomic knowledge administration.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function KnowledgeAdminPage() {
  return <KnowledgeManager />;
}
