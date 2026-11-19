export type AssistantKeyInfo = {
  agent_id: string;
  last_four: string;
  validated_at: string;
  invalidated_at: string | null;
};

export function canOverrideAssistantKey(tier?: string) {
  return tier === 'pro' || tier === 'enterprise';
}
