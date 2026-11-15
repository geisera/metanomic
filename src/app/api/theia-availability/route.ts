import { NextRequest, NextResponse } from "next/server";
import { checkCalendlyAvailability } from "@/lib/calendly";
export const runtime = "nodejs";
export const maxDuration = 40;
const attempts = new Map<string, { count: number; until: number }>();
const json = (data: object, status = 200) => NextResponse.json(data, {status, headers: {"Cache-Control":"no-store"}});

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") return json({error:"Use the availability controls on this website."},403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({error:"Expected JSON."},415);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
  const entry = attempts.get(ip) || {count:0,until:now+3600000};
  entry.count++; attempts.set(ip,entry);
  if (entry.count > 60) return json({error:"Too many availability checks. Please try again later."},429);
  try {
    if (Number(request.headers.get("content-length") || 0) > 2048) return json({error:"Request too large."},413);
    const raw = await request.text();
    if (raw.length > 2048) return json({error:"Request too large."},413);
    const input = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({error:"Invalid request."},400);
    // This endpoint only reads availability. Booking still requires explicit confirmation.
    const result = await checkCalendlyAvailability({...input,limit:6});
    return json(result, result.status === "invalid_request" ? 400 : 200);
  } catch { return json({error:"Could not check availability. Please try again."},500); }
}
