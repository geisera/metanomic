import { NextRequest, NextResponse } from "next/server";
import {
  checkKnowledgeToken, getKnowledgeAdmin, getKnowledgeConfig, KNOWLEDGE_COOKIE,
  parseBody, protectedError, sameOrigin,
} from "@/lib/knowledge-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW = 15 * 60_000;
const MAX_LOGIN_ATTEMPTS = 6;
const logins = new Map<string, { attempts: number; expires: number }>();

function allowedLogin(ip: string): boolean {
  const now = Date.now();
  if (logins.size > 1000) {
    for (const [key, item] of logins) if (item.expires < now) logins.delete(key);
  }
  const current = logins.get(ip);
  const next = !current || current.expires < now
    ? { attempts: 1, expires: now + WINDOW }
    : { attempts: current.attempts + 1, expires: current.expires };
  logins.set(ip, next);
  return next.attempts <= MAX_LOGIN_ATTEMPTS;
}

export async function GET() {
  const auth = await getKnowledgeAdmin();
  if (auth.kind !== "authenticated") return protectedError(auth.kind);
  return NextResponse.json(
    { authenticated: true, email: auth.session.email },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not permitted." }, { status: 403 });
  }
  const body = await parseBody(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (body.action === "logout") {
    const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.delete(KNOWLEDGE_COOKIE);
    return response;
  }

  if (body.action !== "login") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
  const config = getKnowledgeConfig();
  if (!config) return protectedError("not_configured");
  if (typeof body.email !== "string" || body.email.length > 254 ||
      typeof body.password !== "string" || body.password.length < 1 || body.password.length > 256) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowedLogin(ip)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429 });
  }
  try {
    const result = await fetch(config.url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: config.key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: body.email.trim(), password: body.password }),
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!result.ok) {
      if (result.status >= 500) return protectedError("unavailable");
      return NextResponse.json({ error: "Invalid credentials or administrator access not granted." }, { status: 401 });
    }
    const credentials: unknown = await result.json();
    if (!credentials || typeof credentials !== "object" || !("access_token" in credentials) ||
        typeof credentials.access_token !== "string" || credentials.access_token.length > 5000) {
      return protectedError("unavailable");
    }
    const authorized = await checkKnowledgeToken(config, credentials.access_token);
    if (authorized.kind !== "authenticated") {
      if (authorized.kind === "unavailable") return protectedError("unavailable");
      return NextResponse.json({ error: "Invalid credentials or administrator access not granted." }, { status: 401 });
    }
    const remaining = "expires_in" in credentials && typeof credentials.expires_in === "number"
      ? credentials.expires_in - 60 : 3000;
    const ttl = Math.min(3300, Math.max(60, remaining));
    const response = NextResponse.json(
      { authenticated: true, email: authorized.session.email },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(KNOWLEDGE_COOKIE, credentials.access_token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "strict", path: "/", maxAge: ttl,
    });
    return response;
  } catch {
    console.error("Knowledge administrator sign-in service unavailable");
    return protectedError("unavailable");
  }
}
