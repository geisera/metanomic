import { createHash } from "node:crypto";
import { getKnowledgeConfig, type KnowledgeSession } from "./knowledge-server";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
type Json = Record<string, unknown>;
const record = (v: unknown): Json | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Json : null;

export type KnowledgeMatch = {
  document_id: string; title: string; category: string; source_url: string;
  revision: number; chunk_index: number; excerpt: string; score: number;
};
export type SearchResult = {
  status: "found" | "no_matches" | "unavailable";
  matches: KnowledgeMatch[];
  message: string;
};

export function chunkDocument(text: string): string[] {
  // Paragraph-aware chunks with modest overlap, all within pgvector storage limits.
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}/).flatMap(part => {
    const result: string[] = [];
    const value = part.trim();
    for (let i = 0; i < value.length; i += 1250) {
      result.push(value.slice(i, i + 1250));
    }
    return result;
  }).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && (current.length + paragraph.length + 2 > 1550)) {
      chunks.push(current);
      current = current.slice(-180).trim() + "\n\n" + paragraph;
    } else {
      current += (current ? "\n\n" : "") + paragraph;
    }
  }
  if (current) chunks.push(current);
  // The RPC caps indexing at 150 passages.
  if (chunks.length > 150) throw new Error("document_too_many_chunks");
  return chunks;
}

export async function embeddings(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0 || inputs.length > 20 || inputs.some(s => !s || s.length > 2000)) {
    throw new Error("invalid_embedding_batch");
  }
  const key = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!key) throw new Error("embedding_gateway_not_configured");
  const response = await fetch("https://ai-gateway.vercel.sh/v1/embeddings", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs, encoding_format: "float" }),
    signal: AbortSignal.timeout(17000), cache: "no-store",
  });
  if (!response.ok) throw new Error("embedding_gateway_" + response.status);
  const payload = record(await response.json());
  const data = Array.isArray(payload?.data) ? payload.data : [];
  if (data.length !== inputs.length) throw new Error("embedding_count_mismatch");
  const parsed = data.map(record);
  const ordered = parsed.sort((a, b) => Number(a?.index) - Number(b?.index));
  return ordered.map(item => {
    const vector = item?.embedding;
    if (!Array.isArray(vector) || vector.length !== EMBED_DIMS ||
        !vector.every(x => typeof x === "number" && Number.isFinite(x))) {
      throw new Error("invalid_embedding_dimension");
    }
    return vector as number[];
  });
}

export async function indexPublishedDocument(session: KnowledgeSession, docId: string, revision: number): Promise<number> {
  const query = new URLSearchParams({
    select: "id,title,content,status,revision", id: "eq." + docId, limit: "1",
  });
  const docReply = await fetch(session.config.url + "/rest/v1/knowledge_documents?" + query, {
    headers: { apikey: session.config.key, Authorization: "Bearer " + session.token },
    cache: "no-store", signal: AbortSignal.timeout(9000),
  });
  if (!docReply.ok) throw new Error("document_lookup_" + docReply.status);
  const docs: unknown = await docReply.json();
  const doc = Array.isArray(docs) ? record(docs[0]) : null;
  if (!doc || doc.status !== "published" || doc.revision !== revision || typeof doc.content !== "string") {
    throw new Error("document_changed_or_unpublished");
  }
  const chunks = chunkDocument("# " + doc.title + "\n\n" + doc.content);
  // Avoid exceeding HTTP duration; batching also bounds embedding-provider costs.
  const vectors: number[][] = [];
  for (let offset = 0; offset < chunks.length; offset += 16) {
    vectors.push(...await embeddings(chunks.slice(offset, offset + 16)));
  }
  const rows = chunks.map((content, i) => ({
    content, content_hash: createHash("sha256").update(content).digest("hex"),
    embedding: vectors[i],
  }));
  const response = await fetch(session.config.url + "/rest/v1/rpc/knowledge_index_document", {
    method: "POST",
    headers: {
      apikey: session.config.key,
      Authorization: "Bearer " + session.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_document_id: docId, p_revision: revision, p_chunks: rows }),
    signal: AbortSignal.timeout(22000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("document_index_" + response.status);
  const count: unknown = await response.json();
  if (typeof count !== "number") throw new Error("index_count_invalid");
  return count;
}

export async function searchKnowledge(rawQuery: unknown): Promise<SearchResult> {
  if (typeof rawQuery !== "string" || rawQuery.trim().length < 2 || rawQuery.length > 400) {
    return { status: "no_matches", matches: [], message: "Search query must contain 2–400 characters." };
  }
  const config = getKnowledgeConfig();
  if (!config || !process.env.AI_GATEWAY_API_KEY) {
    return { status: "unavailable", matches: [], message: "The knowledge search service is not configured." };
  }
  try {
    const [vector] = await embeddings([rawQuery.trim()]);
    // The SQL function only returns published current-revision excerpts.
    // No administrator JWT or privileged Supabase key is used in public search.
    const response = await fetch(config.url + "/rest/v1/rpc/knowledge_search", {
      method: "POST",
      headers: { apikey: config.key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_query: rawQuery.trim(), p_embedding: vector, p_limit: 5 }),
      signal: AbortSignal.timeout(10000), cache: "no-store",
    });
    if (!response.ok) throw new Error("knowledge_search_" + response.status);
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error("knowledge_search_invalid_reply");
    const matches = body.filter(item => {
      const m = record(item);
      return m && typeof m.document_id === "string" && typeof m.title === "string" &&
        typeof m.excerpt === "string" && typeof m.score === "number";
    }) as KnowledgeMatch[];
    return { status: matches.length ? "found" : "no_matches",
      matches, message: matches.length ? "Retrieved approved source passages." : "No current published knowledge matched the question." };
  } catch (error) {
    console.error("Theia knowledge retrieval failed", error instanceof Error ? error.message : "unknown");
    return { status: "unavailable", matches: [], message: "Knowledge retrieval could not be completed." };
  }
}
