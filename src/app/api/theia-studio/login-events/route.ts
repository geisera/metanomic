import { parseBody, sameOrigin } from '@/lib/knowledge-server';
import { loginErrorCodes, loginEvents, loginMethods } from '@/lib/studio/login-events';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const body = await parseBody(request, 256);
  const event = loginEvents.find(value => value === body?.event);
  const method = loginMethods.find(value => value === body?.method);
  const code = loginErrorCodes.find(value => value === body?.code);
  if (!event || (body?.method !== undefined && !method) || (body?.code !== undefined && !code)) {
    return new Response(null, { status: 400 });
  }
  console.info('studio_login_event', { event, method, code });
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
