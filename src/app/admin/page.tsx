import type { Metadata } from 'next';
import Operations from './Operations';

export const metadata: Metadata = {
    title: 'Metanomic Operations',
    robots: { index:false, follow:false, noarchive:true },
    referrer: 'no-referrer',
};

export default function AdminPage() {
    return <Operations/>;
}
