import { NextRequest, NextResponse } from "next/server";
import {
  DOC_SELECT, getKnowledgeAdmin, knowledgeRest, parseBody, protectedError,
  sameOrigin, validateDocument,
} from "@/lib/knowledge-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const auth = await getKnowledgeAdmin();
  if (auth.kind !== "authenticated") return protectedError(auth.kind);
  try {
    const params = new URLSearchParams({ select: DOC_SELECT, order: "updated_at.desc", limit: "100" });
    const response = await knowledgeRest(auth.session, "knowledge_documents?" + params);
    if (!response.ok) throw new Error("list_" + response.status);
    const documents = await response.json();
    if (!Array.isArray(documents)) throw new Error("invalid_list");
    return NextResponse.json({ documents }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Knowledge document list failed", error instanceof Error ? error.message : "unknown");
    return errorMessage("Could not load knowledge documents.", 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorMessage("Cross-origin requests are not permitted.", 403);
  const auth = await getKnowledgeAdmin();
  if (auth.kind !== "authenticated") return protectedError(auth.kind);
  if (Number(request.headers.get("content-length") || 0) > 4_400_000) {
    return NextResponse.json({ error: "Document request exceeds the hosting payload limit. Split it into smaller files." }, { status: 413 });
  }
  const body = await parseBody(request, 4_400_000);
  const fields = body && validateDocument(body);
  if (!fields) return errorMessage("Invalid document fields. Published documents must have content.", 400);
  try {
    const response = await knowledgeRest(auth.session, "knowledge_documents?select=" + DOC_SELECT, {
      method: "POST", prefer: "return=representation", body: fields,
    });
    if (!response.ok) {
      if (response.status === 400 || response.status === 409 || response.status === 422) {
        return errorMessage("The document could not be saved. Verify required fields.", 400);
      }
      throw new Error("create_" + response.status);
    }
    const documents: unknown = await response.json();
    if (!Array.isArray(documents) || !documents[0]) throw new Error("missing_document");
    return NextResponse.json({ document: documents[0] }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Knowledge document create failed", error instanceof Error ? error.message : "unknown");
    return errorMessage("Could not create the document.", 503);
  }
}
