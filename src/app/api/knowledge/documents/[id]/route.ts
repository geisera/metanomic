import { NextRequest, NextResponse } from "next/server";
import {
  DOC_SELECT, getKnowledgeAdmin, knowledgeRest, parseBody, protectedError,
  sameOrigin, validateDocument,
} from "@/lib/knowledge-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function PATCH(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  const { id } = await context.params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid document ID." }, { status: 400 });
  const auth = await getKnowledgeAdmin();
  if (auth.kind !== "authenticated") return protectedError(auth.kind);
  if (Number(request.headers.get("content-length") || 0) > 4_400_000) {
    return NextResponse.json({ error: "Document request exceeds the hosting payload limit. Split it into smaller files." }, { status: 413 });
  }
  const body = await parseBody(request, 4_400_000);
  const fields = body && validateDocument(body);
  if (!fields || typeof body?.revision !== "number" || !Number.isInteger(body.revision) ||
      body.revision < 1 || body.revision > 1_000_000) {
    return NextResponse.json({ error: "Invalid document or revision." }, { status: 400 });
  }

  try {
    // Optimistic concurrency prevents stale browser tabs silently overwriting edits.
    const query = new URLSearchParams({
      id: "eq." + id, revision: "eq." + body.revision, select: DOC_SELECT,
    });
    const response = await knowledgeRest(auth.session, "knowledge_documents?" + query, {
      method: "PATCH", body: fields, prefer: "return=representation",
    });
    if (!response.ok) {
      if ([400, 409, 422].includes(response.status)) {
        return NextResponse.json({ error: "The document could not be saved. Validate the fields and retry." }, { status: 400 });
      }
      throw new Error("update_" + response.status);
    }
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("invalid_update");
    if (!rows[0]) {
      return NextResponse.json({
        error: "The document has changed since you opened it. Refresh before editing again.",
        conflict: true,
      }, { status: 409 });
    }
    return NextResponse.json({ document: rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Knowledge document update failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not update the document." }, { status: 503 });
  }
}
