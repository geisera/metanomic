'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function SiteAccount() {
    const path = usePathname();
    const show = !['/admin', '/assistant-studio/dashboard', '/particles'].includes(path);
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!show) return;
        let active = true;
        let request: AbortController;
        async function refresh() {
            request?.abort();
            const controller = new AbortController();
            request = controller;
            try {
                const response = await fetch('/api/studio-identity', { cache: 'no-store', signal: controller.signal });
                const identity = response.ok ? await response.json() : null;
                if (active && !controller.signal.aborted) setLabel(identity?.label || '');
            } catch {
                if (active && !controller.signal.aborted) setLabel('');
            }
        }
        void refresh();
        window.addEventListener('focus', refresh);
        window.addEventListener('pageshow', refresh);
        return () => {
            active = false;
            request?.abort();
            window.removeEventListener('focus', refresh);
            window.removeEventListener('pageshow', refresh);
        };
    }, [path, show]);

    if (!show || !label) return null;
    return <div className="container py-2 text-right text-sm [overflow-wrap:anywhere]">Signed in as {label}</div>;
}
