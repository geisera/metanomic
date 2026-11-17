import { runtimeAgent, ipOf, failure } from '@/lib/studio/server';
import { widgetToken } from '@/lib/studio/crypto';
import { StudioError, publicAgent } from '@/lib/studio/core';
import { widgetCss } from '@/lib/studio/widget';
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
    const config = JSON.stringify({ ...publicAgent(a), token: widgetToken(a.id, origin, ipOf(req)), parentOrigin: origin }).replace(/</g, '\\u003c');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>AI assistant</title><style>${widgetCss}</style></head><body><main id="chat"><header><h1 id="name">AI assistant</h1><button id="clear" type="button">Clear</button><button id="close" type="button" aria-label="Close chat">×</button></header><div id="log" role="log" aria-label="Conversation"></div><footer><div id="status" role="status"></div><label for="message">Your message</label><form id="form"><textarea id="message" rows="2" maxlength="4000" required></textarea><button id="send" type="submit">Send</button></form><p><small>AI-generated answers may be inaccurate. Messages are processed by Metanomic and OpenAI. Don’t share sensitive information. <a href="https://metanomic.ai/theia-studio/privacy" target="_blank" rel="noopener">Privacy</a></small></p></footer></main><script id="config" type="application/json">${config}</script><script src="/theia-widget.js" defer></script></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors ${a.origins.join(' ')}; base-uri 'none'; form-action 'none'`, 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
}
catch (e) {
    return failure(e);
} }
