import { embedClient } from '@/lib/studio/widget';
export function GET() { return new Response(embedClient, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } }); }
