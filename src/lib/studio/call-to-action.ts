import { StudioError, knowledgeSourceUrl, type Agent } from './core';

export const CTA_LABEL_MAX = 60;
export const CTA_URL_MAX = 2048;

export function canUseCallToAction(tier?: string | null) {
  return tier === 'pro' || tier === 'enterprise';
}

function ctaUrl(value: string) {
  if (!/^https:\/\//i.test(value) || value.length > CTA_URL_MAX) return null;
  const url = knowledgeSourceUrl(value);
  return url && url.length <= CTA_URL_MAX ? url : null;
}

export function callToActionInput(label: unknown, url: unknown) {
  if (typeof label !== 'string' || typeof url !== 'string') {
    throw new StudioError('Enter button text and a destination URL.');
  }
  const cleanLabel = label.trim();
  const cleanUrl = url.trim();
  if (!cleanLabel && !cleanUrl) return { cta_label: null, cta_url: null };
  if (!cleanLabel || cleanLabel.length > CTA_LABEL_MAX) {
    throw new StudioError(`Enter button text between 1 and ${CTA_LABEL_MAX} characters.`);
  }
  const href = ctaUrl(cleanUrl);
  if (!href) throw new StudioError('Enter a valid HTTPS destination URL without a username or password.');
  return { cta_label: cleanLabel, cta_url: href };
}

export function assistantCallToAction(agent: Pick<Agent, 'cta_label' | 'cta_url'>) {
  const label = agent.cta_label?.trim();
  const href = agent.cta_url ? ctaUrl(agent.cta_url.trim()) : null;
  return label && label.length <= CTA_LABEL_MAX && href ? { label, href } : null;
}
