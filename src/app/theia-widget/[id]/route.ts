import {after} from 'next/server';
import {track} from '@/lib/navigation-analytics';
import { runtimeAgent, ipOf, failure, rest } from '@/lib/studio/server';
import { widgetToken } from '@/lib/studio/crypto';
import { StudioError, publicAgent } from '@/lib/studio/core';
import {appearanceCss} from '@/lib/studio/appearance';
import { widgetCss, widgetAppearanceCss } from '@/lib/studio/widget';
export const runtime = 'nodejs';
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { try {
    const { id } = await params;
    const a = await runtimeAgent(id);
    let origin = '';
    try {
        origin = new URL(req.headers.get('referer') || '').origin;
    }
    catch { }
    if (!a.origins.includes(origin))
        throw new StudioError('Embed this assistant on an approved website.', 403);
    const config = JSON.stringify({ ...publicAgent(a), sendLabel:a.send_label||'Send message', sendDisplay:a.send_display||'icon', token: widgetToken(a.id, origin, ipOf(req)), parentOrigin: origin }).replace(/</g, '\\u003c');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>AI assistant</title><style>${widgetCss}${appearanceCss(a)}${widgetAppearanceCss}</style></head><body><main id="chat"><header><h1 id="name">AI assistant</h1><button id="clear" type="button">Clear</button><button id="fullscreen" type="button" aria-label="Fullscreen" aria-pressed="false" title="Enter fullscreen"><svg class="enter-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/></svg><svg class="exit-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h4V4m12 4h-4V4M8 20v-4H4m12 4v-4h4"/></svg></button><button id="close" type="button" aria-label="Close chat">×</button></header><div id="log" role="log" aria-label="Conversation"></div><footer><div id="status" role="status"></div><label for="message">Your message</label><form id="form"><textarea id="message" rows="2" maxlength="4000" required></textarea><button id="send" type="submit" aria-label="Send message" title="Send message"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form><p><small>AI-generated answers may be inaccurate. Messages are processed by Metanomic and OpenAI. Don’t share sensitive information. <a href="https://metanomic.ai/assistant-studio/privacy" target="_blank" rel="noopener">Privacy</a></small></p></footer></main><script id="config" type="application/json">${config}</script><script src="/theia-widget.js?v=fullscreen-2" defer></script></body></html>`;
    if (!a.first_embed_at) {
        after(async () => {
            try {
                const firstEmbed = new Date();
                const rows = await rest<{id:string}[]>('studio_agents?id=eq.' + a.id + '&first_embed_at=is.null&published=eq.true&select=id', {
                    admin: true, method: 'PATCH', body: {first_embed_at: firstEmbed.toISOString()},
                });
                if (rows.length) track('time_to_first_embed', {elapsed_ms: String(firstEmbed.getTime() - Date.parse(a.created_at))});
            } catch {
                // Milestone recording must never interrupt a visitor's conversation.
                console.error('Assistant Studio could not record the first embed milestone.');
            }
        });
    }
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors ${a.origins.join(' ')}; base-uri 'none'; form-action 'none'`, 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
}
catch (e) {
    return failure(e);
} }
