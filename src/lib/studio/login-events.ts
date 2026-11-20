export const loginEvents = [
  'login_view', 'login_method_selected', 'login_submit', 'login_error',
  'magic_link_sent', 'magic_link_resend', 'signup_click_from_login', 'forgot_password_click',
] as const;

export const loginMethods = ['magic', 'password', 'google', 'microsoft'] as const;
export const loginErrorCodes = [
  'invalid_email', 'password_required', 'invalid_credentials', 'rate_limited',
  'email_delivery_unknown', 'email_delivery_failed', 'network', 'unavailable',
] as const;

type LoginEvent = typeof loginEvents[number];
export type LoginMethod = typeof loginMethods[number];
export type LoginErrorCode = typeof loginErrorCodes[number];

export function trackLogin(event: LoginEvent, method?: LoginMethod, code?: LoginErrorCode) {
  void fetch('/api/theia-studio/login-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    keepalive: true,
    body: JSON.stringify({ event, method, code }),
  }).catch(() => {});
}
