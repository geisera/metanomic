export const actions = {
    suspend_workspace: { label: 'Suspend workspace', role: 'operations', stepUp: false },
    restore_workspace: { label: 'Restore workspace', role: 'operations', stepUp: true },
    disable_embed: { label: 'Disable embed', role: 'operations', stepUp: false },
    enable_embed: { label: 'Restore embed', role: 'operations', stepUp: true },
    block_domain: { label: 'Block domain', role: 'operations', stepUp: false },
    block_ip: { label: 'Block IP address', role: 'operations', stepUp: false },
    remove_block: { label: 'Remove block', role: 'operations', stepUp: true },
    set_plan: { label: 'Set plan override', role: 'billing', stepUp: true },
    clear_plan: { label: 'Clear plan override', role: 'billing', stepUp: true },
    set_message_limit: { label: 'Set message limit override', role: 'billing', stepUp: true },
    clear_message_limit: { label: 'Clear message limit override', role: 'billing', stepUp: true },
} as const;

export type AdminAction = keyof typeof actions;
export type StaffRole = (typeof actions)[AdminAction]['role'] | 'support';
export type Lookup = {
    owner_id: string;
    email: string;
    email_confirmed_at: string | null;
    created_at: string;
    effective_tier: string;
    suspended: boolean;
};
export type Tier = { id: string; name: string; assistants: number; websites: number; documents: number };
export type Workspace = Omit<Lookup,'effective_tier'> & {
    base_tier: string;
    effective_tier: Tier;
    plan_override: { tier_id: string; expires_at: string } | null;
    tiers: Pick<Tier,'id'|'name'>[];
    blocks: { id: string; label: string; expires_at: string }[];
    errors: { request_id: string; agent_id: string; assistant: string; created_at: string; code: string; mode: string }[];
    audit: { created_at: string; actor: string | null; action: string; reason: string; before_state: unknown; after_state: unknown }[];
    assistants: {
        id: string; name: string; model: string; published: boolean; origins: string[];
        configured_limit: number; message_limit: number; limit_expires_at: string | null; embed_disabled: boolean;
        first_embed_at: string | null; last_answer_at: string | null;
        key_status: 'shared'|'override'|'missing'|'override_invalid'|'upgrade_required';
        usage: { day: string; requests: number; failed: number }[];
    }[];
};
