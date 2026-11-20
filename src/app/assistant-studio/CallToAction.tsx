'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { CTA_LABEL_MAX, CTA_URL_MAX, callToActionInput } from '@/lib/studio/call-to-action';
import type { Agent } from '@/lib/studio/core';
import { call, ErrorNotice, SaveBar, useDirty } from './ui';
import s from './studio.module.css';

export default function CallToAction({ enabled, ...props }: { agent: Agent; enabled: boolean; onSaved: () => Promise<void> }) {
  if (enabled) return <CallToActionForm {...props} />;
  return <section className={s.settingsSection} aria-labelledby="assistant-cta-heading">
    <h2 id="assistant-cta-heading">Call to Action</h2>
    <p className={s.help}>Available on Pro and Enterprise. Add a button to your assistant’s widget that links to a booking, product, or contact page.</p>
    <Link href="/assistant-studio#pricing" className="button button-outline">View plans</Link>
  </section>;
}

function CallToActionForm({ agent, onSaved }: { agent: Agent; onSaved: () => Promise<void> }) {
  const [baseline, setBaseline] = useState(agent);
  const [label, setLabel] = useState(agent.cta_label ?? '');
  const [url, setUrl] = useState(agent.cta_url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const dirty = label !== (baseline.cta_label ?? '') || url !== (baseline.cta_url ?? '');
  useDirty('call-to-action', dirty || busy);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      const input = callToActionInput(label, url);
      const { agent: saved } = await call('manage', {
        action: 'save-call-to-action',
        agent_id: agent.id,
        cta_label: input.cta_label ?? '',
        cta_url: input.cta_url ?? '',
      });
      setBaseline(saved);
      setLabel(saved.cta_label ?? '');
      setUrl(saved.cta_url ?? '');
      setNotice(saved.cta_label ? 'Call to action saved.' : 'Call to action removed.');
      await onSaved();
    } catch (error) {
      setError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <form className={s.settingsForm} onSubmit={save} aria-labelledby="assistant-cta-heading">
    <section className={s.settingsSection}>
      <h2 id="assistant-cta-heading">Call to Action</h2>
      <p className={s.help}>Add a button above the message box in your assistant’s widget. It opens the destination in a new tab.</p>
      <div className={s.form}>
        <label>Button text<input value={label} onChange={event => setLabel(event.target.value)} readOnly={busy}
          maxLength={CTA_LABEL_MAX} placeholder="Book a consultation" /></label>
        <label>Destination URL<input value={url} onChange={event => setUrl(event.target.value)} readOnly={busy}
          type="url" maxLength={CTA_URL_MAX} placeholder="https://example.com/book" /></label>
      </div>
      <p className={s.help}>Use an HTTPS URL. To remove the button, clear both fields and save.</p>
      <ErrorNotice error={error} />
      {notice && <p className={s.help} role="status">{notice}</p>}
    </section>
    <SaveBar dirty={dirty} busy={busy} lastSaved={baseline.updated_at} />
  </form>;
}
