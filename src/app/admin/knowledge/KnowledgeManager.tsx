"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { KnowledgeDocument } from "@/lib/knowledge-server";

type Category = KnowledgeDocument["category"];
type Status = KnowledgeDocument["status"];
type Editor = Pick<KnowledgeDocument, "title" | "summary" | "category" | "content" | "source_url" | "status">;
type Revision = Editor & { revision: number; changed_at: string };
type View = "loading" | "login" | "ready" | "setup" | "error";

const EMPTY: Editor = {
  title: "", summary: "", category: "company",
  content: "", source_url: "", status: "draft",
};

const categories: { key: Category; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "services", label: "Services" },
  { key: "technical", label: "Technical" },
  { key: "process", label: "Process" },
  { key: "faq", label: "FAQ" },
  { key: "other", label: "Other" },
];

const field = "w-full rounded-lg border border-[#4a6469] bg-[#0c1b25] px-3 py-2.5 text-base text-[#edf7ed] placeholder:text-[#9db3b0] outline-none focus:border-[#c9ec8a] focus:ring-2 focus:ring-[#c9ec8a]/20 disabled:opacity-60";
const label = "mb-1.5 block text-sm font-semibold text-[#d7e9de]";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#526d69] px-4 text-sm font-semibold text-[#dfefdf] transition-colors hover:bg-[#25403e] disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#c9ec8a] px-5 text-sm font-bold text-[#12231d] transition-colors hover:bg-[#dff9b7] disabled:cursor-wait disabled:opacity-50";

function shortDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}

function fromDoc(doc: KnowledgeDocument): Editor {
  return {
    title: doc.title, summary: doc.summary, category: doc.category,
    content: doc.content, source_url: doc.source_url, status: doc.status,
  };
}

async function decode(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload: unknown = await response.json();
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};
  } catch { return {}; }
}
function errorOf(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
}
function isDocument(value: unknown): value is KnowledgeDocument {
  return value !== null && typeof value === "object" && "id" in value && "revision" in value;
}

export default function KnowledgeManager() {
  const [view, setView] = useState<View>("loading");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Editor>({ ...EMPTY });
  const [dirty, setDirty] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const selected = documents.find(document => document.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return needle ? documents.filter(document =>
      [document.title, document.summary, document.category, document.status]
        .some(part => part.toLowerCase().includes(needle))
    ) : documents;
  }, [documents, query]);

  const load = useCallback(async () => {
    setView("loading");
    try {
      const response = await fetch("/api/knowledge/documents", { cache: "no-store" });
      const data = await decode(response);
      if (response.status === 401) { setView("login"); return; }
      if (response.status === 503) {
        setError(errorOf(data, "Knowledge service is not configured."));
        setView("setup"); return;
      }
      if (!response.ok || !Array.isArray(data.documents)) throw new Error(errorOf(data, "Could not load documents."));
      const docs = data.documents.filter(isDocument) as KnowledgeDocument[];
      setDocuments(docs);
      setView("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to contact the knowledge service.");
      setView("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function select(document: KnowledgeDocument | null) {
    if (working || (dirty && !window.confirm("Discard unsaved changes?"))) return;
    setSelectedId(document?.id || null);
    setDraft(document ? fromDoc(document) : { ...EMPTY });
    setDirty(false);
    setMessage("");
    setError("");
    setShowHistory(false);
    setRevisions([]);
  }

  function change<K extends keyof Editor>(key: K, value: Editor[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setDirty(true);
    setMessage("");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginBusy) return;
    setLoginBusy(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: loginEmail, password: loginPassword }),
      });
      const data = await decode(response);
      if (!response.ok) throw new Error(errorOf(data, "Sign-in failed."));
      setLoginPassword("");
      setEmail(typeof data.email === "string" ? data.email : loginEmail);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in."); }
    finally { setLoginBusy(false); }
  }

  async function logout() {
    if (working || (dirty && !window.confirm("Discard unsaved changes and sign out?"))) return;
    await fetch("/api/knowledge/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setDocuments([]);
    setSelectedId(null);
    setDraft({ ...EMPTY });
    setEmail("");
    setDirty(false);
    setView("login");
    setMessage("");
    setError("");
  }

  async function save(status: Status = draft.status) {
    if (working) return;
    if (!draft.title.trim() || draft.title.trim().length < 3) {
      setError("A title of at least three characters is required."); return;
    }
    if (status === "published" && !draft.content.trim()) {
      setError("Add content before publishing."); return;
    }
    setWorking(true);
    setError("");
    setMessage("");
    const values = { ...draft, status };
    try {
      const method = selected ? "PATCH" : "POST";
      const url = selected ? "/api/knowledge/documents/" + selected.id : "/api/knowledge/documents";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected ? { ...values, revision: selected.revision } : values),
      });
      const data = await decode(response);
      if (response.status === 401) { setView("login"); throw new Error("Session expired. Sign in again."); }
      if (!response.ok || !isDocument(data.document)) throw new Error(errorOf(data, "Document could not be saved."));
      const saved = data.document;
      setDocuments(previous => [saved, ...previous.filter(item => item.id !== saved.id)]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      setSelectedId(saved.id);
      setDraft(fromDoc(saved));
      setDirty(false);
      setShowHistory(false);
      setRevisions([]);
      if (status === "published") {
        setMessage("Published. Indexing approved knowledge for Theia…");
        try {
          const indexedReply = await fetch("/api/knowledge/index", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: saved.id, revision: saved.revision }),
          });
          const indexData = await decode(indexedReply);
          if (!indexedReply.ok) throw new Error(errorOf(indexData, "Indexing could not be completed."));
          setMessage("Published and indexed " + String(indexData.indexed) + " passages for Theia's knowledge retrieval.");
        } catch (cause) {
          setMessage("Document published, but indexing has not completed.");
          setError(cause instanceof Error ? cause.message : "Indexing failed. Select Publish again to retry.");
        }
      } else {
        setMessage(status === "archived" ? "Document archived. Retrieval of prior indexed revisions is now blocked." :
          "Draft saved. Only current published revisions are searchable.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save document."); }
    finally { setWorking(false); }
  }

  async function loadHistory() {
    if (!selected) return;
    setError("");
    try {
      const response = await fetch("/api/knowledge/documents/" + selected.id + "/revisions", { cache: "no-store" });
      const data = await decode(response);
      if (!response.ok || !Array.isArray(data.revisions)) throw new Error(errorOf(data, "Unable to load revisions."));
      setRevisions(data.revisions as Revision[]);
      setShowHistory(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load revisions."); }
  }

  function restoreRevision(revision: Revision) {
    if (dirty && !window.confirm("Replace your unsaved draft with this revision?")) return;
    setDraft({
      title: revision.title, summary: revision.summary, category: revision.category,
      content: revision.content, source_url: revision.source_url, status: "draft",
    });
    setDirty(true);
    setShowHistory(false);
    setMessage("Revision " + revision.revision + " loaded into the editor as a draft. Select Save draft to preserve it as a new revision.");
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      setError("Only Markdown (.md) and plain text (.txt) files are supported in this milestone."); return;
    }
    if (file.size > 100_000) {
      setError("File must be smaller than 100 KB."); return;
    }
    const text = await file.text();
    if (text.length > 100_000) {
      setError("File content exceeds the 100,000-character limit."); return;
    }
    setDraft(previous => ({
      ...previous, content: text,
      title: previous.title || file.name.replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]/g, " "),
    }));
    setDirty(true);
    setError("");
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-80px)] max-w-[1440px] px-4 py-8 text-[#edf6ec] sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <a href="/" className="text-sm font-semibold text-[#c9ec8a] hover:underline">Metanomic</a>
          <p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-[#b5d8bc]">Administration</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Theia Knowledge Base</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c8dcd3]">
            Manage approved company knowledge, technical references, and frequently asked questions.
            Published content is indexed for live retrieval. Drafts and archived documents are excluded.
          </p>
        </div>
        {view === "ready" && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#c8dcd3]">
            {email && <span className="max-w-52 truncate" title={email}>{email}</span>}
            <button className={secondary} type="button" onClick={() => void logout()}>Sign out</button>
          </div>
        )}
      </div>

      {view === "loading" && <p role="status" className="py-20 text-center text-[#c8dcd3]">Checking administrator access…</p>}
      {(view === "setup" || view === "error") && (
        <div role="alert" className="max-w-2xl rounded-xl border border-[#6e6258] bg-[#1f282d] p-6">
          <h2 className="text-xl font-semibold">{view === "setup" ? "Knowledge service not connected" : "Connection error"}</h2>
          <p className="mt-3 text-sm leading-6 text-[#d8ddd2]">{error}</p>
          <p className="mt-3 text-sm text-[#c5d6ce]">
            This interface requires a dedicated Supabase project, the knowledge foundation migration,
            an authorized admin user, and server-side Vercel environment variables.
          </p>
          <button type="button" className={secondary + " mt-5"} onClick={() => void load()}>Retry connection</button>
        </div>
      )}

      {view === "login" && (
        <form onSubmit={event => void login(event)} className="max-w-md rounded-xl border border-[#405b56] bg-[#101f2a] p-6 shadow-xl">
          <h2 className="text-xl font-semibold">Administrator sign in</h2>
          <p className="mt-2 text-sm text-[#c6d7d1]">Use an existing Supabase Auth account granted knowledge-administrator access.</p>
          <div className="mt-5">
            <label htmlFor="knowledge-email" className={label}>Email address</label>
            <input id="knowledge-email" type="email" required autoComplete="username" className={field}
              value={loginEmail} onChange={event => setLoginEmail(event.target.value)} />
          </div>
          <div className="mt-4">
            <label htmlFor="knowledge-password" className={label}>Password</label>
            <input id="knowledge-password" type="password" required autoComplete="current-password" className={field}
              value={loginPassword} onChange={event => setLoginPassword(event.target.value)} />
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-[#ffd3b6]">{error}</p>}
          <button type="submit" disabled={loginBusy} className={primary + " mt-5 w-full"}>
            {loginBusy ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-4 text-xs leading-5 text-[#bacdc5]">
            Registration is disabled here. Ask the project administrator to provision access in Supabase.
          </p>
        </form>
      )}

      {view === "ready" && (
        <div className="grid min-h-[600px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-[#3b5854] bg-[#0f202a] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Documents <span className="text-[#aecaad]">({documents.length})</span></h2>
              <button type="button" className={primary + " px-3"} onClick={() => select(null)}>New</button>
            </div>
            <label htmlFor="knowledge-search" className="sr-only">Filter knowledge documents</label>
            <input id="knowledge-search" type="search" placeholder="Filter documents…" className={field + " mt-4"}
              value={query} onChange={event => setQuery(event.target.value)} />
            <div className="mt-4 max-h-[75vh] space-y-2 overflow-y-auto pr-1" aria-label="Knowledge documents">
              {filtered.length === 0 && <p className="py-4 text-sm text-[#b6c9c0]">No matching documents.</p>}
              {filtered.map(document => (
                <button type="button" key={document.id} onClick={() => select(document)}
                  aria-current={selectedId === document.id ? "true" : undefined}
                  className={"w-full rounded-lg border p-3 text-left transition-colors " +
                    (selectedId === document.id ? "border-[#b3d98d] bg-[#243d34]" : "border-[#354e50] bg-[#122933] hover:bg-[#1c3538]")}>
                  <span className="block truncate text-sm font-semibold">{document.title}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs capitalize text-[#c1d3c7]">
                    <span>{document.category}</span>
                    <span className={document.status === "published" ? "text-[#d5efa9]" : document.status === "archived" ? "text-[#bdc5c7]" : "text-[#e6c897]"}>{document.status}</span>
                  </span>
                  <span className="mt-1 block text-xs text-[#b9cbc4]">{shortDate(document.updated_at)}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 rounded-xl border border-[#3b5854] bg-[#0f202a] p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.15em] text-[#b4d0b6]">{selected ? "Edit document" : "New document"}</p>
                <h2 className="mt-1 text-xl font-semibold">{selected ? selected.title : "Untitled draft"}</h2>
                {selected && <p className="mt-1 text-xs text-[#bacfc1]">Revision {selected.revision} · Updated {shortDate(selected.updated_at)}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {selected && <button type="button" className={secondary} onClick={() => void loadHistory()}>Revision history</button>}
                <button type="button" className={secondary} onClick={() => void save("draft")} disabled={working}>Save draft</button>
                <button type="button" className={primary} onClick={() => void save("published")} disabled={working}>
                  {working ? "Saving…" : "Publish"}
                </button>
              </div>
            </div>

            {message && <p role="status" className="mb-4 rounded-lg border border-[#658b65] bg-[#1b382e] p-3 text-sm text-[#d8efca]">{message}</p>}
            {error && <p role="alert" className="mb-4 rounded-lg border border-[#8f665a] bg-[#392826] p-3 text-sm text-[#ffddc7]">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="knowledge-title" className={label}>Title *</label>
                <input id="knowledge-title" className={field} required maxLength={160} placeholder="e.g. Metanomic AI Services"
                  value={draft.title} onChange={event => change("title", event.target.value)} />
              </div>
              <div>
                <label htmlFor="knowledge-category" className={label}>Category</label>
                <select id="knowledge-category" className={field} value={draft.category}
                  onChange={event => change("category", event.target.value as Category)}>
                  {categories.map(category => <option key={category.key} value={category.key}>{category.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="knowledge-source" className={label}>Source URL (optional, HTTPS)</label>
                <input id="knowledge-source" type="url" className={field} maxLength={500}
                  placeholder="https://…" value={draft.source_url}
                  onChange={event => change("source_url", event.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="knowledge-summary" className={label}>Summary</label>
                <textarea id="knowledge-summary" className={field + " min-h-20 resize-y"}
                  maxLength={600} rows={2} value={draft.summary} onChange={event => change("summary", event.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="knowledge-content" className={label + " mb-0"}>Knowledge content (Markdown or text)</label>
                  <label className={secondary + " cursor-pointer"}>
                    Import .md / .txt
                    <input type="file" accept=".md,.markdown,.txt,text/plain,text/markdown"
                      className="sr-only" onChange={event => void importFile(event)} />
                  </label>
                </div>
                <textarea id="knowledge-content" className={field + " min-h-[330px] resize-y font-mono text-sm leading-6"}
                  maxLength={100000} rows={14}
                  placeholder={"# Approved information\n\nWrite source material here.\n\nOnly publish facts you are comfortable sharing with visitors."}
                  value={draft.content} onChange={event => change("content", event.target.value)} />
                <p className="mt-2 text-xs text-[#b9cbc4]">
                  {draft.content.length.toLocaleString()} / 100,000 characters. HTML is treated as plain text.
                  PDF ingestion and vector indexing are not enabled in this milestone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#385552] pt-5">
              <div className="text-sm text-[#c0d2c6]">
                Current state: <span className="font-semibold capitalize text-[#f2ecd3]">{selected?.status ?? "unsaved"}</span>
                {dirty && <span className="ml-2 text-[#f3cf96]">· Unsaved changes</span>}
              </div>
              <div className="flex flex-wrap gap-3">
                {selected && selected.status !== "archived" && (
                  <button type="button" disabled={working} className={secondary} onClick={() => {
                    if (window.confirm("Archive this document? It will no longer be published.")) void save("archived");
                  }}>Archive</button>
                )}
                <button type="button" disabled={working} className={secondary} onClick={() => void save("draft")}>Save draft</button>
                <button type="button" disabled={working} className={primary} onClick={() => void save("published")}>Publish</button>
              </div>
            </div>

            {showHistory && selected && (
              <section className="mt-7 border-t border-[#385552] pt-5" aria-label="Knowledge revision history">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Revision history</h3>
                  <button type="button" className={secondary} onClick={() => setShowHistory(false)}>Close</button>
                </div>
                <p className="mt-2 text-xs text-[#bbd0c1]">Restore places an old version in the editor as a draft. You must save it to create a new revision.</p>
                <div className="mt-4 max-h-[340px] space-y-2 overflow-auto">
                  {revisions.map(revision => (
                    <div key={revision.revision} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#385552] p-3">
                      <div>
                        <p className="font-semibold">Revision {revision.revision} · <span className="font-normal capitalize">{revision.status}</span></p>
                        <p className="text-xs text-[#c4d6cc]">{shortDate(revision.changed_at)}</p>
                      </div>
                      <button type="button" className={secondary} onClick={() => restoreRevision(revision)}>Load revision</button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
