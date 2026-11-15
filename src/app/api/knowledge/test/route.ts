import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeAdmin, parseBody, protectedError, sameOrigin } from "@/lib/knowledge-server";
import { searchKnowledge } from "@/lib/theia-rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 35;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not permitted." }, { status: 403 });
  const auth = await getKnowledgeAdmin();
  if (auth.kind !== "authenticated") return protectedError(auth.kind);
  const body = await parseBody(request);
  if (!body || typeof body.query !== "string" || body.query.trim().length < 2 || body.query.length > 400) {
    return NextResponse.json({ error: "Enter a question of 2–400 characters." }, { status: 400 });
  }
  const result = await searchKnowledge(body.query);
  return NextResponse.json(result, { status: result.status === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "no-store" } });
}
