import type {ReactNode} from 'react';
import {ArrowTopRightOnSquareIcon,Bars3Icon,BookOpenIcon,ChartBarIcon,CodeBracketIcon,Cog6ToothIcon,ExclamationTriangleIcon,EyeIcon,ShieldCheckIcon,UserIcon} from '@heroicons/react/24/outline';
import s from './studio.module.css';

const icons = {
  reports: ChartBarIcon,
  status: Bars3Icon,
  settings: Cog6ToothIcon,
  knowledge: BookOpenIcon,
  cta: ArrowTopRightOnSquareIcon,
  scope: ShieldCheckIcon,
  preview: EyeIcon,
  embed: CodeBracketIcon,
  profile: UserIcon,
  security: ShieldCheckIcon,
  danger: ExclamationTriangleIcon,
} as const;

export function SettingsIcon({name}:{name:keyof typeof icons}) {
  const Icon = icons[name];
  return <Icon width={22} height={22}/>;
}

export default function SettingsNav({label,children}:{label:string;children:ReactNode}) {
  return <aside className={s.settingsSidebar}><nav className={s.settingsNav} aria-label={label}>{children}</nav></aside>;
}
