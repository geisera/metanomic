import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeAdmin, parseBody, protectedError, sameOrigin } from "@/lib/knowledge-server";
import { indexPublishedDocument } from "@/lib/theia-rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  const auth = await getKnowledgeAdmin();
  if (auth.kind !== "authenticated") return protectedError(auth.kind);
  const data = await parseBody(request);
  const id = data?.documentId, revision = data?.revision;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) ||
      typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) {
    return NextResponse.json({ error: "Invalid document ID or revision." }, { status: 400 });
  }
  try {
    const indexed = await indexPublishedDocument(auth.session, id, revision);
    return NextResponse.json({ indexed, revision }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("Knowledge document indexing failed", reason);
    const changed = reason === "document_changed_or_unpublished" || reason === "document_index_400";
    return NextResponse.json({
      error: changed ? "Document changed or was unpublished. Refresh and publish its current revision."
        : "Indexing failed. The document is saved but cannot be retrieved yet. Retry indexing.",
      indexed: 0,
    }, { status: changed ? 409 : 503 });
  }
}
