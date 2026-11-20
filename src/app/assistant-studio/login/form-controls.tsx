import type { ComponentProps } from 'react';
import s from './login.module.css';

export function Input(props: ComponentProps<'input'>) {
  return <input {...props} className={s.input} />;
}

export function Button({ pending, children, ...props }: ComponentProps<'button'> & { pending?: string }) {
  return <button {...props} className={s.primary} disabled={props.disabled || !!pending}>
    {pending && <span className={s.spinner} aria-hidden="true" />}
    {pending || children}
  </button>;
}

export function Divider() {
  return <div aria-hidden="true" className={s.divider}>or</div>;
}

// Placeholder only. An OAuth provider needs a Studio-compatible callback before it can be enabled.
export function OAuthButton({ provider }: { provider: 'Google' | 'Microsoft' }) {
  return <button type="button" className={s.oauth} disabled>Continue with {provider} (coming soon)</button>;
}

export function Icon({ name, size = 20 }: { name: 'lock' | 'mail' | 'eye' | 'eyeOff' | 'check' | 'theme'; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'lock' && <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" /></>}
    {name === 'mail' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>}
    {(name === 'eye' || name === 'eyeOff') && <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.4" />{name === 'eyeOff' && <path d="m3 3 18 18" />}</>}
    {name === 'check' && <path d="m5 12 5 5L20 7" />}
    {name === 'theme' && <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
  </svg>;
}
