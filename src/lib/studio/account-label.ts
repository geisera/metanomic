export function accountLabel(user: { email: string; user_metadata?: { display_name?: unknown } }) {
    const name = user.user_metadata?.display_name;
    return (typeof name === 'string' && name.trim()) || user.email;
}
