const unsafePath = /[\\\u0000-\u001f\u007f]|%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i;

export function loginRedirect(value: unknown, origin: string): string | null {
  if (typeof value !== 'string' || !value || value.length > 2048 || value.trim() !== value) return null;
  if (!value.startsWith('/') && !/^https?:\/\//i.test(value)) return null;
  if (value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password || unsafePath.test(url.pathname)) return null;
    if (url.pathname.startsWith('//') || /^\/assistant-studio\/login\/*$/.test(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function loginDestinationName(destination: string) {
  const path = new URL(destination, 'https://metanomic.ai').pathname.replace(/\/$/, '');
  const labels: Record<string, string> = {
    '/assistant-studio/account': 'Account settings',
    '/assistant-studio/billing': 'Billing',
    '/assistant-studio/dashboard': 'your Studio dashboard',
    '/assistant-studio/docs': 'Studio documentation',
  };
  return labels[path] || 'your requested page';
}

export const signupEmailKey = 'studio:login-signup-email';
