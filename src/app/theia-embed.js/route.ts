import { embedLoader } from '@/lib/studio/widget';
export function GET() { return new Response(embedLoader, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'X-Content-Type-Options': 'nosniff' } }); }
