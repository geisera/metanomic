import type {ReactNode} from 'react';
import s from './studio.module.css';

const icons = {
  status: 'M4 6h16M4 12h16M4 18h16',
  settings: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1',
  knowledge: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4V4Zm9 3a3 3 0 0 1 3-3h4v14h-3a4 4 0 0 0-4 3',
  preview: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  embed: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  profile: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 0-8 0 4 4 0 0 0 8 0',
  security: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-4 10 3 3 5-6',
  danger: 'M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01',
} as const;

export function SettingsIcon({name}:{name:keyof typeof icons}) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]}/></svg>;
}

export default function SettingsNav({label,children}:{label:string;children:ReactNode}) {
  return <aside className={s.settingsSidebar}><nav className={s.settingsNav} aria-label={label}>{children}</nav></aside>;
}
