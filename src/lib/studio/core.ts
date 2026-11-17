export type Agent = {
    configured_at?: string | null; first_published_at?: string | null; usage_alert?: boolean; button_label?: string; button_color?: string; launcher_color?: string | null; send_label?: string | null; send_color?: string | null; send_text_color?: string | null; user_message_color?: string | null; button_text_color?: string | null; button_outline_color?: string | null; button_position?: string; launcher_style?: string; tab_side?: string; tab_alignment?: string; tab_orientation?: string;
    id: string;
    owner_id: string;
    name: string;
    greeting: string;
    instructions: string;
    model: string;
    published: boolean;
    origins: string[];
    daily_limit: number;
    max_output: number;
    created_at: string;
    updated_at: string;
};
export type Document = {
    id: string;
    agent_id: string;
    title: string;
    content: string;
    published: boolean;
    updated_at: string;
};
export type Message = {
    role: 'user' | 'assistant';
    content: string;
};
export const MODELS = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini'];
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export class StudioError extends Error {
    constructor(message: string, public status = 400, public code?: string) { super(message); }
}
export function text(v: unknown, max: number, min = 0) { if (typeof v !== 'string' || v.trim().length < min || v.length > max)
    throw new StudioError(`Enter text between ${min} and ${max} characters.`); return v.trim(); }
export function origins(value: unknown) { if (!Array.isArray(value) || value.length > 10)
    throw new StudioError('Add up to 10 website origins.'); return [...new Set(value.map(v => { try {
        const u = new URL(String(v));
        if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash || u.hostname.includes('*'))
            throw 0;
        return u.origin;
    }
    catch {
        throw new StudioError('Use exact HTTPS origins such as https://example.com, without paths or wildcards.');
    } }))]; }
export function agentInput(b: Record<string, unknown>) { const model = text(b.model, 80, 1); if (!MODELS.includes(model))
    throw new StudioError('Select a supported model.'); const daily_limit = Number(b.daily_limit), max_output = Number(b.max_output); if (!Number.isInteger(daily_limit) || daily_limit < 1 || daily_limit > 1000 || !Number.isInteger(max_output) || max_output < 200 || max_output > 2000)
    throw new StudioError('Daily limit must be 1–1,000 and output limit 200–2,000.'); const sites = origins(b.origins); if (b.published === true && !sites.length)
    throw new StudioError('Add an approved website before publishing.'); return { name: text(b.name, 80, 1), greeting: text(b.greeting, 300, 1), instructions: text(b.instructions, 8000), model, published: b.published === true, origins: sites, daily_limit, max_output, updated_at: new Date().toISOString() }; }
export function messages(value: unknown): Message[] { if (!Array.isArray(value) || value.length < 1 || value.length > 16)
    throw new StudioError('Send between 1 and 16 recent messages.'); let size = 0; const rows = value.map((v, i) => { if (!v || !['user', 'assistant'].includes(v.role) || v.role !== (i % 2 === 0 ? 'user' : 'assistant'))
    throw new StudioError('Invalid conversation order.'); const content = text(v.content, v.role === 'user' ? 4000 : 16000, 1); size += content.length; return { role: v.role, content }; }); if (rows.at(-1)?.role !== 'user' || size > 16000)
    throw new StudioError('Conversation is too long or does not end with a user message.'); return rows; }
export function knowledgeContext(docs: Document[], question: string) { const terms = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(0, 30); const chunks = docs.filter(d => d.published).flatMap(d => { const out: {
    title: string;
    text: string;
    score: number;
}[] = []; for (let i = 0; i < d.content.length; i += 1400) {
    const chunk = d.content.slice(i, i + 1800);
    out.push({ title: d.title, text: chunk, score: terms.reduce((n, t) => n + (chunk.toLowerCase().includes(t) ? 1 : 0) + (d.title.toLowerCase().includes(t) ? 2 : 0), 0) });
} return out; }); return chunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(c => ({ title: c.title, passage: c.text })); }
export function publicAgent(a: Agent) { return { id: a.id, name: a.name, greeting: a.greeting }; }
