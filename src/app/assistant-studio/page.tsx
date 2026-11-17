import type { Metadata } from 'next';
import Studio from './Studio';
export const metadata: Metadata = { title: 'Assistant Studio', description: 'Configure and embed your own AI assistant, hosted by Metanomic.', robots: { index: false, follow: false } };
export default function Page() { return <Studio />; }
