import type { ComponentProps } from 'react';
import { CheckIcon, ComputerDesktopIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
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

const icons = { lock: LockClosedIcon, mail: EnvelopeIcon, eye: EyeIcon, eyeOff: EyeSlashIcon, check: CheckIcon, theme: ComputerDesktopIcon } as const;

export function Icon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  const Component = icons[name];
  return <Component width={size} height={size} />;
}
