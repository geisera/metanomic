import { StudioError, type Document } from './core';

export const SCOPE_TOPIC_LIMIT = 24;
export const SCOPE_TOPIC_LENGTH = 120;
export const SCOPE_MODEL = 'openai/gpt-6-luna';

export type ScopeConfig = {
  enabled: boolean;
  pro_monthly: number;
  enterprise_monthly: number;
  global_monthly: number;
  timeout_ms: number;
};
export const scopeLimits = {
  pro_monthly: { label: 'Pro checks per workspace per month', min: 0, max: 100000 },
  enterprise_monthly: { label: 'Enterprise checks per workspace per month', min: 0, max: 500000 },
  global_monthly: { label: 'Total checks per month', min: 0, max: 2000000 },
  timeout_ms: { label: 'Provider timeout in milliseconds', min: 1000, max: 6000 },
} as const;

export function canUseScopeControl(tier?: string) {
  return tier === 'pro' || tier === 'enterprise';
}

export function normalizeTopics(topics: string[]) {
  const seen = new Set<string>();
  return topics.map(topic => topic.replace(/\s+/g, ' ').trim().slice(0, SCOPE_TOPIC_LENGTH)).filter(topic => {
    const key = topic.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, SCOPE_TOPIC_LIMIT);
}

export function topicsFromKnowledge(documents: Document[]) {
  const published = documents.filter(doc => doc.published);
  const titles = published.map(doc => doc.title);
  const headings = published.flatMap(doc => Array.from(
    doc.content.slice(0, 32000).matchAll(/^ {0,3}#{1,6}[ \t]+([^\r\n]+)$/gm),
    match => match[1].replace(/\s+#+\s*$/, '')
  ));
  return normalizeTopics([...titles, ...headings]);
}

export function scopeTopicsInput(value: unknown) {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length > SCOPE_TOPIC_LIMIT ||
      value.some(topic => typeof topic !== 'string' || !topic.trim() || topic.length > SCOPE_TOPIC_LENGTH)) {
    throw new StudioError('Use up to 24 topics, with 120 characters per line.');
  }
  const topics = normalizeTopics(value as string[]);
  if (!topics.length) throw new StudioError('Add at least one topic or use published Knowledge automatically.');
  return topics;
}

export function scopeConfigInput(value: Record<string, unknown>): ScopeConfig {
  if (typeof value.enabled !== 'boolean') throw new StudioError('Choose whether Scope Control is available.');
  const fields = Object.entries(scopeLimits).map(([key, { label, min, max }]) => {
    const entry = value[key];
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < min || entry > max) {
      throw new StudioError(label + ' must be between ' + min + ' and ' + max + '.');
    }
    return [key, entry];
  });
  return { enabled: value.enabled, ...Object.fromEntries(fields) } as ScopeConfig;
}
