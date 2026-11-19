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

export type Account = {
    owner_id: string;
    email: string;
    display_name: string;
    email_confirmed_at: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    inactive: boolean;
    suspended: boolean;
    is_staff: boolean;
    tier_id: string;
    effective_tier: string;
};

export type AccountDirectory = { accounts: Account[]; count: number; tiers: Tier[] };

export const accountActions = {
    send_account_email: { label: 'Send email', role: 'support' },
    update_account: { label: 'Edit profile', role: 'operations' },
    activate_account: { label: 'Activate sign-in', role: 'operations' },
    deactivate_account: { label: 'Deactivate sign-in', role: 'operations' },
    verify_account_email: { label: 'Mark email verified', role: 'operations' },
    reset_account_password: { label: 'Send password reset', role: 'operations' },
    revoke_account_sessions: { label: 'Sign out all devices', role: 'operations' },
    set_membership: { label: 'Change membership', role: 'billing' },
    save_membership_plan: { label: 'Configure membership plans', role: 'billing' },
} as const;
export type AccountAction = keyof typeof accountActions;

export type StudioStats = {
    as_of: string;
    members: number;
    active_members: number;
    verified_members: number;
    new_members: number;
    suspended_workspaces: number;
    assistants: number;
    published_assistants: number;
    live_embeds: number;
    knowledge_documents: number;
    messages: number;
    failed: number;
    tiers: {
        id: string; name: string; configured: boolean; members: number; active_members: number;
        assistants: number; live_embeds: number; messages: number;
    }[];
    days: {day:string; messages:number; failed:number}[];
};
