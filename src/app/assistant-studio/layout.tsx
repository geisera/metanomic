import type { Metadata } from 'next';
import s from './studio.module.css';
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Layout({ children }: {
    children: React.ReactNode;
}) {
    return <>{children}<div className={s.feedbackStack} id="studio-feedback"/></>;
}
