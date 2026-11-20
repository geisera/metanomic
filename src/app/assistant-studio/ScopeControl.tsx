'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { Agent } from '@/lib/studio/core';
import { SCOPE_TOPIC_LIMIT } from '@/lib/studio/scope-control';
import { call, ErrorNotice, SaveBar, useDirty } from './ui';
import s from './studio.module.css';

export default function ScopeControl({ agent, available, onSaved }: {
  agent: Agent; available: boolean; onSaved: () => Promise<void>;
}) {
  if (available) return <ScopeForm agent={agent} onSaved={onSaved} />;
  return <section className={s.settingsSection}>
    <h2>Scope Control <small>Beta</small></h2>
    <p className={s.help}>Keep your assistant focused on your business. Available on Pro and Enterprise.</p>
    <Link href="/assistant-studio#pricing" className="button button-outline">View plans</Link>
  </section>;
}

function ScopeForm({ agent, onSaved }: { agent: Agent; onSaved: () => Promise<void> }) {
  const [saved, setSaved] = useState(agent);
  const [enabled, setEnabled] = useState(agent.scope_enabled !== false);
  const [automatic, setAutomatic] = useState(agent.scope_topics == null);
  const [topics, setTopics] = useState(agent.scope_topics?.join('\n') ?? '');
  const [pending, setPending] = useState<'save' | 'import' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const dirty = enabled !== (saved.scope_enabled !== false) ||
    automatic !== (saved.scope_topics == null) || (!automatic && topics !== (saved.scope_topics?.join('\n') ?? ''));
  useDirty('scope-control', dirty || Boolean(pending));

  async function importTopics() {
    if (pending) return;
    setPending('import');
    setError(null);
    setNotice('');
    try {
      const { topics: imported } = await call('manage', { action: 'scope-topics', agent_id: agent.id });
      if (!imported.length) {
        setNotice('Publish a Knowledge document to import its topics.');
        return;
      }
      setTopics(imported.join('\n'));
      setAutomatic(false);
      setNotice('Topics imported. Review the list and save to use it.');
    } catch (error) {
      setError(error);
    } finally {
      setPending(null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !dirty) return;
    setPending('save');
    setError(null);
    setNotice('');
    try {
      const { agent: updated } = await call('manage', {
        action: 'save-scope-control', agent_id: agent.id, enabled,
        topics: automatic ? null : topics.split('\n').map(topic => topic.trim()).filter(Boolean),
      });
      setSaved(updated);
      setEnabled(updated.scope_enabled !== false);
      setAutomatic(updated.scope_topics == null);
      setTopics(updated.scope_topics?.join('\n') ?? '');
      await onSaved();
      setNotice('Scope settings saved.');
    } catch (error) {
      setError(error);
    } finally {
      setPending(null);
    }
  }

  return <form className={s.settingsForm} onSubmit={save} aria-labelledby="scope-control-title">
    <section className={s.settingsSection}>
      <h2 id="scope-control-title">Scope Control <small>Beta</small></h2>
      <p className={s.help}>The managed classifier redirects clearly unrelated questions and asks for clarification when a connection to your business is unclear.</p>
      <label className={s.check}><input type="checkbox" checked={enabled} disabled={!!pending}
        onChange={event => setEnabled(event.target.checked)} />Enable Scope Control</label>
      <label className={s.check}><input type="checkbox" checked={automatic} disabled={!!pending}
        onChange={event => setAutomatic(event.target.checked)} />Follow published Knowledge automatically</label>
      <p className={s.help}>Automatic scope uses titles and headings from published documents. Turn off automatic scope to maintain your own topics.</p>
      <div className={s.actions}>
        <button type="button" className="button button-outline" disabled={!!pending}
          onClick={() => void importTopics()}>{pending === 'import' ? 'Importing…' : !automatic && topics.trim() ? 'Replace list with published topics' : 'Import topics to edit'}</button>
      </div>
      {!automatic && <div className={s.form}>
        <label>Allowed topics<textarea rows={7} disabled={!!pending} value={topics}
          onChange={event => setTopics(event.target.value)} aria-describedby="scope-topics-help" /></label>
        <p className={s.help} id="scope-topics-help">One topic per line, up to {SCOPE_TOPIC_LIMIT} topics and 120 characters per line.</p>
      </div>}
      <p className={s.help}>If a managed check is unavailable or the allowance is reached, Studio uses a scope instruction in the reply. Test your scope in Preview after saving.</p>
      <ErrorNotice error={error} />
      {notice && <p className={s.help} role="status">{notice}</p>}
    </section>
    <SaveBar dirty={dirty} busy={!!pending} lastSaved={saved.updated_at} />
  </form>;
}
