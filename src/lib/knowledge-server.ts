import { cookies } from "next/headers";

// Server-only Supabase REST access with the signed-in user's JWT.
// Never use a service-role/secret key for editor operations: RLS must enforce admin access.
export const KNOWLEDGE_COOKIE = "theia_knowledge_session";
export const DOC_SELECT = "id,title,summary,category,content,source_url,status,revision,created_at,updated_at,published_at";

type Config = { url: string; key: string };
export type KnowledgeSession = { token: string; userId: string; email?: string; config: Config };
export type KnowledgeAuthResult =
  | { kind: "authenticated"; session: KnowledgeSession }
  | { kind: "unauthenticated" | "not_configured" | "unavailable" };

export type KnowledgeDocument = {
  id: string;
  title: string;
  summary: string;
  category: "company" | "services" | "technical" | "process" | "faq" | "other";
  content: string;
  source_url: string;
  status: "draft" | "published" | "archived";
  revision: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export const CATEGORIES = ["company", "services", "technical", "process", "faq", "other"] as const;
export const STATUSES = ["draft", "published", "archived"] as const;

export function getKnowledgeConfig(): Config | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || "";
  if (!key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) return null;
    return { url, key };
  } catch {
    return null;
  }
}

function requestHeaders(config: Config, token?: string): HeadersInit {
  return {
    apikey: config.key,
    Authorization: "Bearer " + (token || config.key),
    Accept: "application/json",
  };
}

export async function checkKnowledgeToken(config: Config, token: string): Promise<KnowledgeAuthResult> {
  if (!token || token.length > 5000) return { kind: "unauthenticated" };
  try {
    const userResponse = await fetch(config.url + "/auth/v1/user", {
      headers: requestHeaders(config, token),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (userResponse.status === 401 || userResponse.status === 403) return { kind: "unauthenticated" };
    if (!userResponse.ok) throw new Error("auth_user_" + userResponse.status);
    const user: unknown = await userResponse.json();
    if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(user.id)) return { kind: "unauthenticated" };

    const check = await fetch(config.url + "/rest/v1/knowledge_admins?select=user_id&user_id=eq." + encodeURIComponent(user.id) + "&limit=1", {
      headers: requestHeaders(config, token),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (check.status === 401 || check.status === 403) return { kind: "unauthenticated" };
    if (!check.ok) throw new Error("knowledge_admin_lookup_" + check.status);
    const rows: unknown = await check.json();
    if (!Array.isArray(rows) || rows.length === 0) return { kind: "unauthenticated" };
    return {
      kind: "authenticated",
      session: {
        token,
        userId: user.id,
        email: "email" in user && typeof user.email === "string" ? user.email : undefined,
        config,
      },
    };
  } catch (error) {
    console.error("Knowledge administration session lookup failed", error instanceof Error ? error.message : "unknown");
    return { kind: "unavailable" };
  }
}

export async function getKnowledgeAdmin(): Promise<KnowledgeAuthResult> {
  const config = getKnowledgeConfig();
  if (!config) return { kind: "not_configured" };
  const token = (await cookies()).get(KNOWLEDGE_COOKIE)?.value;
  return token ? checkKnowledgeToken(config, token) : { kind: "unauthenticated" };
}

export function protectedError(kind: Exclude<KnowledgeAuthResult["kind"], "authenticated">) {
  const status = kind === "unauthenticated" ? 401 : 503;
  return Response.json({
    error: kind === "not_configured"
      ? "Knowledge base is not yet connected to a dedicated Supabase project."
      : kind === "unauthenticated" ? "Please sign in as a knowledge administrator."
        : "Knowledge service is currently unavailable.",
  }, { status, headers: { "Cache-Control": "no-store" } });
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch { return false; }
}

export async function parseBody(request: Request, max = 140_000): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.includes("application/json") ||
      Number(request.headers.get("content-length") || 0) > max) return null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > max) return null;
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export function validateDocument(input: Record<string, unknown>): {
  title: string; summary: string; category: string; content: string; source_url: string; status: string;
} | null {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const category = input.category;
  const status = input.status;
  const source_url = typeof input.source_url === "string" ? input.source_url.trim() : "";
  if (title.length < 3 || title.length > 160 || summary.length > 600 ||
      source_url.length > 500 ||
      !CATEGORIES.includes(category as typeof CATEGORIES[number]) ||
      !STATUSES.includes(status as typeof STATUSES[number])) return null;
  if (status === "published" && !content) return null;
  if (source_url) {
    try { if (new URL(source_url).protocol !== "https:") return null; } catch { return null; }
  }
  return { title, summary, category: category as string, content, source_url, status: status as string };
}

export async function knowledgeRest(
  session: KnowledgeSession,
  endpoint: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; prefer?: string } = {},
): Promise<Response> {
  if (!endpoint.startsWith("knowledge_") || endpoint.includes("..") || endpoint.includes("//")) {
    throw new Error("Invalid knowledge API endpoint");
  }
  return fetch(session.config.url + "/rest/v1/" + endpoint, {
    method: options.method || "GET",
    headers: {
      ...requestHeaders(session.config, session.token),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
}
