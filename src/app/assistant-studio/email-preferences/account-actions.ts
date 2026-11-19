'use server';

import {rest, session} from '@/lib/studio/server';

export async function readAccountEmailPreferences() {
    const {user} = await session();
    const [preferences] = await rest<{setup_tips:boolean; product_updates:boolean}[]>(
        'studio_email_preferences?select=setup_tips,product_updates&account_id=eq.' + user.id,
        {admin:true},
    );
    return preferences ?? {setup_tips:true, product_updates:false};
}

export async function saveAccountEmailPreferences(form:FormData) {
    const {user} = await session();
    await rest('studio_email_preferences?on_conflict=account_id', {
        admin:true,
        body:{account_id:user.id, setup_tips:form.has('tips'), product_updates:form.has('products')},
        prefer:'resolution=merge-duplicates,return=minimal',
    });
}
