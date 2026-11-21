export const STARTER_MONTHLY_CENTS = 500;
export const STARTER_TRIAL_DAYS = 14;
export const STARTER_TRIAL_OFFER = '$5/month after a 14-day free trial';

export type StarterAccess = {
    state: 'ready' | 'trial' | 'expired' | 'subscribed';
    endsAt: string | null;
    canManage: boolean;
    canSubscribe: boolean;
};
