import { NextResponse } from "next/server";
import { getKnowledgeAdmin, knowledgeRest, protectedError } from "@/lib/knowledge-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await getKnowledgeAdmin();
  if (auth.kind !== "authenticated") return protectedError(auth.kind);
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid document ID." }, { status: 400 });
  }
  try {
    const params = new URLSearchParams({
      document_id: "eq." + id,
      select: "revision,title,summary,category,content,source_url,status,changed_at,changed_by",
      order: "revision.desc",
      limit: "40",
    });
    const response = await knowledgeRest(auth.session, "knowledge_revisions?" + params);
    if (!response.ok) throw new Error("revisions_" + response.status);
    const revisions: unknown = await response.json();
    if (!Array.isArray(revisions)) throw new Error("invalid_revisions");
    return NextResponse.json({ revisions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Knowledge revision lookup failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not load revision history." }, { status: 503 });
  }
}
